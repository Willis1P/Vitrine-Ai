import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import ffmpegPath from 'ffmpeg-static'

const execFileAsync = promisify(execFile)

export const DEFAULT_VOICE = 'pt-BR-FranciscaNeural'

let cachedPython: string | null | undefined

async function resolveEdgeTtsPython(): Promise<string | null> {
  if (cachedPython !== undefined) return cachedPython
  const candidates: string[][] = []
  if (process.env.VITRINE_PYTHON) candidates.push([process.env.VITRINE_PYTHON])
  if (process.platform === 'win32') {
    const stable = path.join('C:', 'vitrine', 'pyembed', 'python.exe')
    candidates.push([stable])
  }
  candidates.push(['py', '-3'], ['python'])
  for (const cand of candidates) {
    try {
      const r = await execFileAsync(cand[0], [...cand.slice(1), '-c', 'import edge_tts; print("ok")'], {
        timeout: 10000,
        windowsHide: true,
      })
      if (r.stdout.includes('ok')) {
        cachedPython = cand.join(' ')
        return cachedPython
      }
    } catch {
      /* try next */
    }
  }
  cachedPython = null
  return null
}

async function ttsWithEdge(text: string, voice: string, outPath: string): Promise<boolean> {
  const py = await resolveEdgeTtsPython()
  if (!py) return false
  const [cmd, ...rest] = py.split(' ')
  try {
    await execFileAsync(
      cmd,
      [...rest, '-m', 'edge_tts', '--voice', voice, '--rate', '+5%', '--pitch', '+0Hz', '--text', text, '--write-media', outPath],
      { timeout: 120000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 }
    )
    const st = await fs.stat(outPath)
    return st.size > 200
  } catch {
    return false
  }
}

function chunkText(text: string, maxLen = 180): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  const parts: string[] = []
  let current = ''
  for (const sentence of clean.split(/(?<=[.!?])\s+/)) {
    if ((current + ' ' + sentence).trim().length <= maxLen) {
      current += (current ? ' ' : '') + sentence
    } else {
      if (current) parts.push(current.trim())
      for (let i = 0; i < sentence.length; i += maxLen) parts.push(sentence.slice(i, i + maxLen))
      current = ''
    }
  }
  if (current) parts.push(current.trim())
  return parts.length ? parts : [clean]
}

async function ttsWithGoogle(text: string, outPath: string): Promise<boolean> {
  const chunks = chunkText(text)
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-google-'))
  const files: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pt-BR&ttsspeed=1&q=${encodeURIComponent(chunks[i])}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
      return false
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const fp = path.join(tmpDir, `c${i}.mp3`)
    await fs.writeFile(fp, buf)
    files.push(fp)
  }
  try {
    await concatAudioFiles(files, outPath, tmpDir)
    return (await fs.stat(outPath)).size > 200
  } catch {
    return false
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function generateSpeech(text: string, voice: string = DEFAULT_VOICE): Promise<Buffer | null> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-'))
  const out = path.join(tmp, 'speech.mp3')
  try {
    if (!(await ttsWithEdge(text, voice, out))) {
      if (voice !== DEFAULT_VOICE) await ttsWithEdge(text, DEFAULT_VOICE, out)
      if (!(await ttsWithGoogle(text, out))) return null
    }
    return await fs.readFile(out)
  } catch {
    return null
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
  }
}

export async function concatWithSilence(buffers: Buffer[], silenceSeconds = 0.4): Promise<Buffer> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-concat-'))
  try {
    const inputs: string[] = []
    const labels: string[] = []
    let concatRefs: string[] = []
    let labelIdx = 0
    for (let i = 0; i < buffers.length; i++) {
      const fp = path.join(tmpDir, `a${i}.mp3`)
      await fs.writeFile(fp, buffers[i])
      inputs.push('-i', fp)
      labels.push(`[${labelIdx}:a]aresample=24000[a${labelIdx}]`)
      concatRefs.push(`[a${labelIdx}]`)
      labelIdx++
      if (i < buffers.length - 1) {
        inputs.push('-f', 'lavfi', '-t', String(silenceSeconds), '-i', 'anullsrc=channel_layout=mono:sample_rate=24000')
        labels.push(`[${labelIdx}:a]aresample=24000[s${i}]`)
        concatRefs.push(`[s${i}]`)
        labelIdx++
      }
    }
    const out = path.join(tmpDir, 'narration.mp3')
    const filter = `${labels.join(';')};${concatRefs.join('')}concat=n=${concatRefs.length}:v=0:a=1[a]`
    await execFileAsync(
      ffmpegPath!,
      ['-y', ...inputs, '-filter_complex', filter, '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '128k', out],
      { timeout: 120000, windowsHide: true }
    )
    return await fs.readFile(out)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function concatAudioFiles(files: string[], outPath: string, tmpDir: string): Promise<void> {
  const inputs: string[] = []
  const labels: string[] = []
  const refs: string[] = []
  for (let i = 0; i < files.length; i++) {
    inputs.push('-i', files[i])
    labels.push(`[${i}:a]aresample=24000[a${i}]`)
    refs.push(`[a${i}]`)
  }
  const filter = `${labels.join(';')};${refs.join('')}concat=n=${refs.length}:v=0:a=1[a]`
  await execFileAsync(
    ffmpegPath!,
    ['-y', ...inputs, '-filter_complex', filter, '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '128k', outPath],
    { timeout: 120000, windowsHide: true }
  )
}

export async function getAudioDurationMs(buf: Buffer): Promise<number> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tts-dur-'))
  const fp = path.join(tmpDir, 'a.mp3')
  try {
    await fs.writeFile(fp, buf)
    const r = await execFileAsync(ffmpegPath!, ['-i', fp], { timeout: 30000, windowsHide: true, encoding: 'utf8' }).catch((e) => e)
    const stderr = String((r as any).stderr || '')
    const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/)
    if (!m) return 0
    return (parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseFloat(m[3])) * 1000
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
  }
}