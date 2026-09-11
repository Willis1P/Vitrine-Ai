import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import ffmpegPath from 'ffmpeg-static'

const execFileAsync = promisify(execFile)

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const FINAL_W = 1024
const FINAL_H = 1024

export interface BeautifyOptions {
  imageUrl: string
  backdrop?: 'marble' | 'studio' | 'outdoor' | string
  outputName?: string
}

export interface BeautifyResult {
  ok: true
  resultUrl: string
  bgRemoved: boolean
  provider: 'local-cv2-ffmpeg'
}

const BACKDROP_PROMPTS: Record<string, string> = {
  marble: 'luxury marble podium studio background, soft lighting, e-commerce product photography, clean minimal, beige and gold tones, empty surface',
  studio: 'soft beige seamless studio background, elegant soft gradient, diffused soft lighting, e-commerce product photography, clean minimal, empty surface',
  outdoor: 'warm golden hour outdoor scene, blurred trees bokeh background, soft natural light, e-commerce product photography, clean minimal, empty space',
}

const GRABCUT_SCRIPT = `
import cv2
import numpy as np
import sys


def main():
    src = sys.argv[1]
    dst = sys.argv[2]
    flag = sys.argv[3]
    img = cv2.imread(src, cv2.IMREAD_UNCHANGED)
    if img is None:
        sys.exit(3)
    if img.ndim == 3 and img.shape[2] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    h, w = img.shape[:2]
    if max(h, w) > 1280:
        scale = 1280.0 / max(h, w)
        img = cv2.resize(img, (int(round(w * scale)), int(round(h * scale))), interpolation=cv2.INTER_AREA)
        h, w = img.shape[:2]
    x0, y0 = int(w * 0.15), int(h * 0.15)
    x1, y1 = int(w * 0.85), int(h * 0.85)
    if x1 - x0 < 16 or y1 - y0 < 16:
        x0, y0, x1, y1 = 0, 0, w, h
    mask = np.zeros((h, w), dtype=np.uint8)
    mask[y0:y1, x0:x1] = cv2.GC_PR_FGD
    bgd = np.zeros((1, 65), dtype=np.float64)
    fgd = np.zeros((1, 65), dtype=np.float64)
    rect = (x0, y0, x1 - x0, y1 - y0)
    cv2.grabCut(img, mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    keep = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    if cv2.countNonZero(keep) < max(8, int(h * w * 0.005)):
        alpha = np.full((h, w), 255, dtype=np.uint8)
        bg = '0'
    else:
        k = 5 if min(h, w) >= 500 else 3
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
        keep = cv2.morphologyEx(keep, cv2.MORPH_OPEN, kernel)
        keep = cv2.dilate(keep, kernel, iterations=1)
        keep = cv2.GaussianBlur(keep, (0, 0), 0.8)
        alpha = keep
        bg = '1'
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    cv2.imwrite(dst, rgba)
    with open(flag, 'w') as f:
        f.write(bg)


if __name__ == '__main__':
    main()
`

let pythonPath: { cmd: string; args: string[] } | null = null
let pythonProbed = false
let cv2Ready: boolean | null = null

async function resolvePython(): Promise<{ cmd: string; args: string[] } | null> {
  if (pythonProbed) return pythonPath
  pythonProbed = true
  const candidates = [process.env.VITRINE_PYTHON, 'C:\\vitrine\\python310\\python.exe', 'python'].filter(
    (c): c is string => Boolean(c)
  )
  for (const cand of candidates) {
    try {
      const [cmd, ...args] = cand.split(' ')
      const r = await execFileAsync(cmd, [...args, '-c', 'print("py-ok")'], {
        timeout: 15000,
        windowsHide: true,
      })
      if (r.stdout.includes('py-ok')) {
        pythonPath = { cmd, args }
        break
      }
    } catch {
      /* try next candidate */
    }
  }
  return pythonPath
}

export async function isCv2Available(): Promise<boolean> {
  if (cv2Ready !== null) return cv2Ready
  cv2Ready = false
  const py = await resolvePython()
  if (!py) return false
  try {
    const r = await execFileAsync(py.cmd, [...py.args, '-c', 'import cv2, numpy; print(cv2.__version__)'], {
      timeout: 20000,
      windowsHide: true,
    })
    cv2Ready = /\d+\.\d+/.test(r.stdout)
  } catch {
    cv2Ready = false
  }
  return cv2Ready
}

function detectExt(buf: Buffer): string {
  if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  if (
    buf.length > 12 &&
    buf.toString('latin1', 0, 4) === 'RIFF' &&
    buf.toString('latin1', 8, 12) === 'WEBP'
  )
    return 'webp'
  return 'jpg'
}

async function downloadImage(imageUrl: string): Promise<Buffer> {
  let url = imageUrl
  if (!/^https?:\/\//i.test(url)) {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    url = `${base}${url.startsWith('/') ? url : '/' + url}`
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Falha ao baixar a imagem do produto (status ${res.status})`)
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_IMAGE_BYTES) throw new Error('Imagem excede o limite de 20MB')
  if (!contentType.startsWith('image/') && !['png', 'webp', 'jpg'].includes(detectExt(buf))) {
    throw new Error('A URL informada não corresponde a uma imagem (JPEG, PNG ou WebP)')
  }
  return buf
}

async function toPng(workFile: string, tmpDir: string): Promise<string> {
  const png = path.join(tmpDir, 'source.png')
  await execFileAsync(
    ffmpegPath!,
    ['-y', '-i', workFile, '-frames:v', '1', '-pix_fmt', 'rgba', png],
    { timeout: 60000, windowsHide: true }
  )
  return png
}

async function runGrabCut(
  py: { cmd: string; args: string[] },
  tmpDir: string,
  srcPng: string
): Promise<{ cutout: string; bgRemoved: boolean }> {
  const script = path.join(tmpDir, 'grabcut_helper.py')
  const dst = path.join(tmpDir, 'cutout.png')
  const flag = path.join(tmpDir, 'bgflag.txt')
  await fs.writeFile(script, GRABCUT_SCRIPT, 'utf8')
  await execFileAsync(py.cmd, [...py.args, script, srcPng, dst, flag], {
    timeout: 90000,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  })
  const bgRemoved = (await fs.readFile(flag, 'utf8').catch(() => '0')).trim() === '1'
  return { cutout: dst, bgRemoved }
}

async function fetchBackdrop(tmpDir: string, backdrop: string): Promise<string> {
  const outPath = path.join(tmpDir, 'backdrop.png')
  const prompt = BACKDROP_PROMPTS[backdrop] || BACKDROP_PROMPTS.marble
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${FINAL_W}&height=${FINAL_H}&seed=${Date.now() % 100000}&nologo=true`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      if (['png', 'webp', 'jpg'].includes(detectExt(buf))) {
        await fs.writeFile(outPath, buf)
        return outPath
      }
    }
  } catch {
    /* fall through to local gradient */
  }
  try {
    await execFileAsync(
      ffmpegPath!,
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        `gradients=s=${FINAL_W}x${FINAL_H}:c0=0xF7F2EA:c1=0xE0D3BB:x0=0:y0=0:x1=${FINAL_W}:y1=${FINAL_H}:n=2:duration=0.2`,
        '-frames:v',
        '1',
        outPath,
      ],
      { timeout: 60000, windowsHide: true }
    )
  } catch {
    await execFileAsync(
      ffmpegPath!,
      ['-y', '-f', 'lavfi', '-i', `color=c=0xF5F1EA:s=${FINAL_W}x${FINAL_H}:d=1`, '-frames:v', '1', outPath],
      { timeout: 60000, windowsHide: true }
    )
  }
  return outPath
}

function buildCompositeFilter(): string {
  return [
    `[0:v]scale=${FINAL_W}:${FINAL_H}:force_original_aspect_ratio=increase,crop=${FINAL_W}:${FINAL_H}[bg]`,
    `[1:v]format=rgba,split=2[cuta][cutb]`,
    `[cuta]scale=860:614:force_original_aspect_ratio=decrease[prod]`,
    `[cutb]scale=860:614:force_original_aspect_ratio=decrease,boxblur=luma_radius=16:luma_power=2:alpha_radius=16:alpha_power=2,colorchannelmixer=rr=0:gg=0:bb=0:aa=0.4[shadow]`,
    `[bg][shadow]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2+28[bgs]`,
    `[bgs][prod]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto[out]`,
  ].join(';')
}

async function compositeProduct(tmpDir: string, cutout: string, backdrop: string): Promise<string> {
  const jpgPath = path.join(tmpDir, 'final_raw.jpg')
  await execFileAsync(
    ffmpegPath!,
    [
      '-y',
      '-i',
      backdrop,
      '-i',
      cutout,
      '-filter_complex',
      buildCompositeFilter(),
      '-map',
      '[out]',
      '-frames:v',
      '1',
      '-c:v',
      'mjpeg',
      '-q:v',
      '2',
      jpgPath,
    ],
    { timeout: 120000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }
  )
  return jpgPath
}

export async function beautifyProduct(opts: BeautifyOptions): Promise<BeautifyResult> {
  if (!opts.imageUrl) throw new Error('Informe a URL da imagem do produto')
  const py = await resolvePython()
  if (!py || !(await isCv2Available())) throw new Error('OpenCV (cv2) indisponível no servidor')

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beautify-'))
  try {
    const imgBuf = await downloadImage(opts.imageUrl)
    const rawFile = path.join(tmpDir, `input.${detectExt(imgBuf)}`)
    await fs.writeFile(rawFile, imgBuf)
    const srcPng = await toPng(rawFile, tmpDir)
    const { cutout, bgRemoved } = await runGrabCut(py, tmpDir, srcPng)
    const backdropPath = await fetchBackdrop(tmpDir, opts.backdrop || 'marble')
    const finalRaw = await compositeProduct(tmpDir, cutout, backdropPath)

    const publicDir = path.join(process.cwd(), 'public', 'generated')
    await fs.mkdir(publicDir, { recursive: true })
    const fallback = `prod_${Date.now()}`
    const clean =
      (opts.outputName || '')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .replace(/\.(jpe?g|png)$/i, '')
        .slice(0, 80) || fallback
    const fileName = `${clean}.jpg`
    await fs.copyFile(finalRaw, path.join(publicDir, fileName))
    return { ok: true, resultUrl: `/generated/${fileName}`, bgRemoved, provider: 'local-cv2-ffmpeg' }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}