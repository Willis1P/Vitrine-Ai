import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import ffmpegPath from 'ffmpeg-static'
import { buildDefaultPrompt, LOOKS, NEGATIVE_PROMPT, type LookId } from './ugc-shared'
import { concatWithSilence, DEFAULT_VOICE, generateSpeech, getAudioDurationMs } from './tts'

const execFileAsync = promisify(execFile)

export const UGC_RATIOS = {
  '9:16': { label: '9:16 Vertical', width: 576, height: 1024 },
  '16:9': { label: '16:9 Widescreen', width: 1024, height: 576 },
  '3:4': { label: 'Vertical 3:4', width: 768, height: 1024 },
  '1:1': { label: 'Quadrado 1:1', width: 768, height: 768 },
} as const

export type UgcRatioId = keyof typeof UGC_RATIOS

export interface UgcOptions {
  productName: string
  images: string[]
  sellingPoints: string[]
  ratio: UgcRatioId
  prompt?: string
  look?: LookId
  voice?: string
}

export interface UgcResult {
  urlPath: string
  filePath: string
  sizeBytes: number
  durationSeconds: number
  scripts: string[]
  sellingPoints: string[]
  prompt: string
  narrationApplied: boolean
  voice: string
}

const MIN_TAKE_DURATION = 8
const TAKE_FPS = 24
const TAKE_LABELS = ['HOOK', 'VALOR', 'CTA']

async function callPollinationsText(prompt: string): Promise<string | null> {
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai',
        seed: Math.floor(Math.random() * 100000),
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const text = await res.text()
    return text.trim()
  } catch {
    return null
  }
}

export async function generateSellingPoints(productName: string): Promise<string[]> {
  const fallback = [
    `Qualidade premium em ${productName.toLowerCase()}, material de primeira linha`,
    `Custo-benefício: melhor preço do mercado para esse acabamento`,
    'Entrega rápida e segura, garantia de satisfação',
  ]
  try {
    const raw = await callPollinationsText(
      `Produto: ${productName}\nListe EXATAMENTE 3 pontos de venda (selling points) objetivos em PT-BR para um anúncio TikTok Shop de alta conversão. Cada um com até 12 palavras, benefício concreto, sem jargão. Formato: 1. / 2. / 3. Sem texto extra.`
    )
    if (!raw) return fallback
    const lines = raw
      .split('\n')
      .map((l) => l.replace(/^\d+\.\s*/, '').trim())
      .filter((l) => l.length > 3)
      .slice(0, 3)
    const clean = lines.length >= 2 ? lines : null
    return clean || fallback
  } catch {
    return fallback
  }
}

async function generateAidaScripts(productName: string, sellingPoints: string[]): Promise<string[]> {
  const fallback = [
    `Esse ${productName} acabou de chegar e todo mundo pergunta onde comprei. Presta atenção, é isso aqui.`,
    `${sellingPoints[0] || 'Qualidade premium'} — esse produto entrega demais pelo preço. ${sellingPoints[1] || 'Vale cada centavo'}.`,
    `Corre pro carrinho laranja aqui embaixo e traz esse pra casa antes que acabe o estoque.`,
  ]
  try {
    const raw = await callPollinationsText(
      `Crie um anúncio UGC TikTok Shop em PT-BR. Produto: ${productName}\nPontos de venda:\n- ${sellingPoints.join('\n- ')}\n\nGere EXATAMENTE 3 takes:\n1. HOOK (atenção imediata, até 20 palavras)\n2. VALOR (benefícios usando os pontos de venda, até 24 palavras)\n3. CTA (chama para clicar no carrinho laranja aqui embaixo, até 18 palavras)\n\nRegras: PT-BR natural, ritmo falado, sem começar com "Para tudo". Formato: 1. 2. 3. Sem texto extra.`
    )
    if (!raw) return fallback
    const lines = raw
      .split('\n')
      .map((l) => l.replace(/^\d+\.\s*/, '').trim().replace(/^["']|["']$/g, ''))
      .filter((l) => l.length > 20)
      .slice(0, 3)
    const scripts = lines.length >= 3 ? lines : fallback
    scripts[1] = scripts[1] || fallback[1]
    scripts[2] = scripts[2] || fallback[2]
    return [scripts[0], scripts[1], scripts[2]]
  } catch {
    return fallback
  }
}

function pollinationsImageUrl(prompt: string, width: number, height: number, seed: number, ref?: string): string {
  let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&model=flux&seed=${seed}&enhance=true`
  url += `&negative_prompt=${encodeURIComponent(NEGATIVE_PROMPT)}`
  if (ref) url += `&image=${encodeURIComponent(ref)}`
  return url
}

async function fetchTakeImage(prompt: string, width: number, height: number, seed: number, ref?: string): Promise<Buffer> {
  let res = await fetch(pollinationsImageUrl(prompt, width, height, seed, ref), { signal: AbortSignal.timeout(90000) })
  if (!res.ok && ref) {
    res = await fetch(pollinationsImageUrl(prompt, width, height, seed), { signal: AbortSignal.timeout(90000) })
  }
  if (!res.ok) throw new Error(`Falha ao gerar cena UGC (status ${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

function sanitize(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\''").replace(/%/g, '\\%')
}

function buildTakeFilter(text: string, takeIndex: number, width: number, height: number, duration: number): string {
  const label = sanitize(TAKE_LABELS[takeIndex] || 'TAKE')
  const safe = sanitize(text.slice(0, 64))
  const frames = Math.round(TAKE_FPS * duration)
  const zoompan = `zoompan=z='min(zoom+0.001,1.15)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${TAKE_FPS}`
  const fade = `fade=t=in:st=0:d=0.4,fade=t=out:st=${Math.max(duration - 0.4, 0)}:d=0.4`
  const drawLabel = `drawtext=text='${label}':x=24:y=24:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8:fontfile='C\\:/Windows/Fonts/arialbd.ttf'`
  const drawText = `drawtext=text='${safe}':x=(w-text_w)/2:y=h-th-80:fontsize=16:fontcolor=white:box=1:boxcolor=purple@0.55:boxborderw=8:fontfile='C\\:/Windows/Fonts/arial.ttf'`
  return `${zoompan},${fade},${drawLabel},${drawText}`
}

export async function generateUgcVideo(options: UgcOptions): Promise<UgcResult> {
  const ratio = UGC_RATIOS[options.ratio]
  const sellingPoints = options.sellingPoints.length >= 2 ? options.sellingPoints.slice(0, 3) : await generateSellingPoints(options.productName)
  const look = options.look || 'brazilian'
  const lookDesc = LOOKS[look]?.descEn || LOOKS.brazilian.descEn
  const voice = options.voice || DEFAULT_VOICE
  const prompt = (options.prompt && options.prompt.trim()) || buildDefaultPrompt(options.productName, sellingPoints, look)
  const scripts = await generateAidaScripts(options.productName, sellingPoints)
  const ref = options.images[0]

  const narrBuffers: (Buffer | null)[] = []
  for (const s of scripts) narrBuffers.push(await generateSpeech(s, voice))

  const takeDurations: number[] = []
  for (let t = 0; t < 3; t++) {
    let dur = MIN_TAKE_DURATION
    if (narrBuffers[t]) {
      const audioMs = await getAudioDurationMs(narrBuffers[t]!)
      if (audioMs > 0) dur = Math.max(dur, Math.ceil(audioMs / 1000) + 1)
    }
    takeDurations.push(dur)
  }
  const totalDuration = takeDurations.reduce((a, b) => a + b, 0)

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ugc-free-'))
  const segmentPaths: string[] = []

  const scenes = [
    `UGC style, ${lookDesc}. Opening hook: ${prompt}`,
    `UGC style, ${lookDesc}. Value: showing the product benefits up close in her hands: ${prompt}`,
    `UGC style, ${lookDesc}. Call to action: confident look toward the camera while holding the product: ${prompt}`,
  ]
  for (let t = 0; t < 3; t++) {
    const scenePrompt = scenes[t]
    const seed = (Date.now() % 100000) + t * 137
    const buf = await fetchTakeImage(scenePrompt, ratio.width, ratio.height, seed, ref)
    const tmpImg = path.join(tmpDir, `take_${t}_${Date.now()}.jpg`)
    await fs.writeFile(tmpImg, buf)
    const seg = path.join(tmpDir, `take_${t}_${Date.now()}.mp4`)
    const filter = buildTakeFilter(scripts[t] || '', t, ratio.width, ratio.height, takeDurations[t])
    const args = [
      '-y', '-loop', '1', '-framerate', String(TAKE_FPS), '-i', tmpImg,
      '-vf', filter,
      '-t', String(takeDurations[t]), '-r', String(TAKE_FPS),
      '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', seg,
    ]
    try {
      await execFileAsync(ffmpegPath!, args, { timeout: 120000 })
    } finally {
      await fs.rm(tmpImg, { force: true }).catch(() => {})
    }
    segmentPaths.push(seg)
  }

  const publicDir = path.join(process.cwd(), 'public', 'generated')
  await fs.mkdir(publicDir, { recursive: true })
  const finalName = `ugc_${Date.now()}.mp4`
  const finalPath = path.join(publicDir, finalName)

  const listPath = path.join(tmpDir, 'segments.txt')
  const listContent = segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  await fs.writeFile(listPath, listContent, 'utf8')
  const videoOnly = path.join(tmpDir, 'video_only.mp4')
  await execFileAsync(ffmpegPath!, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', videoOnly], { timeout: 60000 })

  let narrationApplied = false
  const narrOk = narrBuffers.filter((b): b is Buffer => b !== null)
  if (narrOk.length === 3) {
    const combined = await concatWithSilence(narrOk)
    const narrationMp3 = path.join(tmpDir, 'narration.mp3')
    await fs.writeFile(narrationMp3, combined)
    await execFileAsync(
      ffmpegPath!,
      ['-y', '-i', videoOnly, '-i', narrationMp3, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', finalPath],
      { timeout: 60000 }
    )
    narrationApplied = true
  } else {
    await fs.copyFile(videoOnly, finalPath)
  }

  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})

  const stats = await fs.stat(finalPath)
  return {
    urlPath: `/generated/${finalName}`,
    filePath: finalPath,
    sizeBytes: stats.size,
    durationSeconds: totalDuration,
    scripts,
    sellingPoints,
    prompt,
    narrationApplied,
    voice,
  }
}