// Video Assembler FREE - port de vibevid/src/video/assembler.py
// Vibevid original concatena 3 takes Veo 3 (Hook/Value/CTA) via moviepy
// FREE: concatena 3 segmentos gerados via Pollinations+FFmpeg (3 imagens com overlay de take + zoompan) + montagem final

import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'
import ffmpegPath from 'ffmpeg-static'

const execFileAsync = promisify(execFile)

async function fetchImageBuffer(prompt: string, seed: number): Promise<Buffer> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=576&height=1024&nologo=true&model=flux&seed=${seed}`
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`Pollinations ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function sanitize(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\''").replace(/%/g, '\\%')
}

function buildFilterForTake(text: string, duration: number, takeIndex: number): string {
  const takeLabel = ['HOOK', 'VALOR', 'CTA'][takeIndex] || 'TAKE'
  const safe = sanitize(text.slice(0, 60))
  const title = sanitize(takeLabel)
  // Zoompan + fade + drawtext (take label + narração)
  const fps = 24
  const frames = Math.round(fps * duration)
  const zoompan = `zoompan=z='min(zoom+0.001,1.15)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=576x1024:fps=${fps}`
  const fade = `fade=t=in:st=0:d=0.4,fade=t=out:st=${Math.max(duration - 0.4, 0)}:d=0.4`
  const drawLabel = `drawtext=text='${title}':x=24:y=24:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8:fontfile='C\\:/Windows/Fonts/arialbd.ttf'`
  const drawText = `drawtext=text='${safe}':x=(w-text_w)/2:y=h-th-80:fontsize=16:fontcolor=white:box=1:boxcolor=purple@0.55:boxborderw=8:fontfile='C\\:/Windows/Fonts/arial.ttf'`
  return `${zoompan},${fade},${drawLabel},${drawText}`
}

export async function generateTakeVideo(
  prompt: string,
  script: string,
  takeIndex: number,
  outputDir: string,
  seedBase: number
): Promise<string> {
  const buf = await fetchImageBuffer(prompt, seedBase + takeIndex * 100)
  const tmpImg = path.join(outputDir, `take_${takeIndex}_${Date.now()}.jpg`)
  await fs.writeFile(tmpImg, buf)
  const out = path.join(outputDir, `take_${takeIndex}_${Date.now()}.mp4`)
  const filter = buildFilterForTake(script, 8, takeIndex)
  const args = [
    '-y', '-loop', '1', '-framerate', '24', '-i', tmpImg,
    '-vf', filter,
    '-t', '8', '-r', '24', '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out,
  ]
  try {
    await execFileAsync(ffmpegPath!, args, { timeout: 120000 })
  } finally {
    await fs.rm(tmpImg, { force: true }).catch(() => {})
  }
  return out
}

export async function assembleAd(segments: string[], outputPath: string): Promise<string> {
  // concat via ffmpeg concat demuxer
  const listPath = outputPath + '_list.txt'
  const content = segments.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  await fs.writeFile(listPath, content, 'utf8')
  const args = ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath]
  await execFileAsync(ffmpegPath!, args, { timeout: 60000 })
  await fs.rm(listPath, { force: true }).catch(() => {})
  return outputPath
}
