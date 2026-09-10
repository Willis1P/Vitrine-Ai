import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'
import ffmpegPath from 'ffmpeg-static'

const execFileAsync = promisify(execFile)

export interface VideoGenerationParams {
  productName: string
  description: string
  videoType: string
  duration: number
  style: string
}

export interface VideoGenerationResult {
  filePath: string
  urlPath: string
  sizeBytes: number
  durationSeconds: number
  provider: 'free' | 'muapi'
}

const IMAGE_WIDTH = 576
const IMAGE_HEIGHT = 1024

async function generateProductImage(params: VideoGenerationParams): Promise<Buffer> {
  const prompt = buildImagePrompt(params)

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true&model=flux`

  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(90000),
  })

  if (!response.ok) {
    throw new Error(`Falha ao gerar imagem (status ${response.status})`)
  }

  return Buffer.from(await response.arrayBuffer())
}

function buildImagePrompt(params: VideoGenerationParams): string {
  const name = params.productName || 'produto'
  const desc = params.description || name

  let scene: string
  switch (params.videoType) {
    case 'ugc':
      scene = 'Young woman holding the product naturally, authentic UGC review video style, genuine smile, soft natural lighting, realistic'
      break
    case 'review':
      scene = 'Man giving a product review gesture with thumbs up, holding the product, studio lighting, professional review video style, realistic'
      break
    case 'showcase':
      scene = 'Meticulous product showcase on a clean modern table, premium studio product photography, dramatic soft lighting, floating dark background with subtle glow'
      break
    case 'promo':
      scene = 'Cinematic promotional footage with product as hero, vibrant gradient background glowing light, premium advertising style, sharp focus'
      break
    case 'before-after':
      scene = 'Product transformation before and after concept, split lighting, dramatic change visible, beauty product advertisement style, realistic'
      break
    case 'offer':
      scene = 'Product with ribbons and confetti, special offer celebration, bright festive lighting, retail promotional photography, vertical composition'
      break
    default:
      scene = 'Professional product photography of the product, clean composition, studio lighting, vertical composition'
  }

  return `${scene}. The product is: ${name}. ${desc}. Vertical 9:16 social media video frame, high quality, realistic, vibrant colors`
}

function sanitizeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\''")
    .replace(/,/g, '\\,')
}
const MAX_TITLE = 28
const MAX_SUBTITLE = 72

function fitTitle(text: string): string {
  const t = (text || '').toUpperCase()
  return t.length > MAX_TITLE ? t.slice(0, MAX_TITLE).trim() + '...' : t
}

function fitSubtitle(text: string): string {
  return text.length > MAX_SUBTITLE ? text.slice(0, MAX_SUBTITLE).trim() + '...' : text
}

function buildFilter(params: VideoGenerationParams, fps: number, totalFrames: number): string {
  const duration = params.duration
  const title = fitTitle(params.productName)
  const subtitle = fitSubtitle(params.description || (params.videoType === 'offer' ? 'Oferta imperdível' : 'Veja no link da bio'))
  const fpsStr = String(fps)
  const frameCount = Math.max(90, totalFrames)
  const dSuffix = frameCount / fps

  const zoomStep = duration >= 45 ? 0.0004 : duration >= 20 ? 0.0006 : 0.001
  const zoom = `min(zoom+${zoomStep.toFixed(4)},1.25)`

  const xExpr = `x='iw/2-(iw/zoom/2)'`
  const yExpr = `y='ih/2-(ih/zoom/2)'`
  const zoompan = `zoompan=z='${zoom}':d=${frameCount}:${xExpr}:${yExpr}:s=${IMAGE_WIDTH}x${IMAGE_HEIGHT}:fps=${fpsStr}`

  let titleBoxStyle = `drawtext=text='${sanitizeDrawText(
    title
  )}':x=(w-text_w)/2:y=h-th-260:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=16:fontfile='C\\:/Windows/Fonts/arialbd.ttf'`

  let subtitleFilter = `drawtext=text='${sanitizeDrawText(
    subtitle
  )}':x=(w-text_w)/2:y=h-th-120:fontsize=24:fontcolor=white:box=1:boxcolor=purple@0.55:boxborderw=10:fontfile='C\\:/Windows/Fonts/arial.ttf'`

  if (params.style === 'tiktok') {
    titleBoxStyle += `:y=120`
    subtitleFilter = `drawtext=text='${sanitizeDrawText(
      subtitle
    )}':x=(w-text_w)/2:y=h-th-140:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=12:fontfile='C\\:/Windows/Fonts/arialbd.ttf'`
  }

  const fadeIn = `fade=t=in:st=0:d=0.6`
  const fadeOut = `fade=t=out:st=${Math.max(dSuffix - 0.6, 0)}:d=0.6`

  return `${zoompan},${fadeIn},${fadeOut},${titleBoxStyle},${subtitleFilter}`
}

async function renderMp4(imageBuffer: Buffer, params: VideoGenerationParams, outputDir: string): Promise<string> {
  const tmpBase = path.join(process.cwd(), 'public', 'generated')
  await fs.mkdir(tmpBase, { recursive: true })
  const tmpImage = path.join(outputDir, `img_${Date.now()}.jpg`)
  await fs.writeFile(tmpImage, imageBuffer)

  const outputFile = path.join(tmpBase, `video_${Date.now()}.mp4`)
  const urlPath = `/generated/${path.basename(outputFile)}`

  const fps = 30
  const duration = params.duration
  const totalFrames = Math.round(fps * duration)
  const filter = buildFilter(params, fps, totalFrames)

  const args = [
    '-y',
    '-loop',
    '1',
    '-framerate',
    '30',
    '-i',
    tmpImage,
    '-vf',
    filter,
    '-t',
    String(duration),
    '-r',
    '30',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputFile,
  ]

  try {
    await execFileAsync(ffmpegPath!, args, { maxBuffer: 10 * 1024 * 1024, timeout: 180000 })
  } finally {
    await fs.rm(tmpImage, { force: true })
  }

  return outputFile
}

export async function generateFreeProductVideo(
  params: VideoGenerationParams,
  outputDir: string,
  outputUrlBase: string = '/generated'
): Promise<VideoGenerationResult> {
  const imageBuffer = await generateProductImage(params)
  const outputFile = await renderMp4(imageBuffer, params, outputDir)

  const stats = await fs.stat(outputFile)
  const urlPath = `${outputUrlBase}/${path.basename(outputFile)}`

  return {
    filePath: outputFile,
    urlPath,
    sizeBytes: stats.size,
    durationSeconds: params.duration,
    provider: 'free',
  }
}