// Pipeline FREE orchestrator - port de vibevid/src/main.py (run_auto + run_interactive) adaptado para Vitrine
// Fluxo: Foto/URL -> Frames com persona (forge) -> Scorer -> AIDA scripts -> Vídeo 3-takes free (Pollinations + FFmpeg) -> Assembly

import { PromptForgeFree } from './forge'
import { generateAidaScripts } from './scripts'
import { scoreFrame } from './scorer'
import { generateTakeVideo, assembleAd } from './assembler'
import { VibevidConfig } from './config'
import { analyzeProduct } from './product-analyst'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

export interface PipelineInput {
  productName: string
  productDescription?: string
  productCategory?: string
  marketplace?: string
  style?: string
  imageUrl?: string // foto enviada (supabase) ou URL do produto
  mode: 'auto' | 'interactive'
  numFrames?: number // default 3
  withVideo?: boolean // false = só frames+scripts (~20s), true = inclui 3-takes
}

export interface PipelineFrame {
  frame_id: string
  prompt: string
  negative_prompt: string
  persona_name: string
  persona_dna: string
  scenario: string
  category: string
  score: number
  approved: boolean
  imageUrl: string // pollinations URL
}

export interface PipelineResult {
  frames: PipelineFrame[]
  approvedFrames: PipelineFrame[]
  scripts: Record<string, string[]> // frame_id -> 3 takes
  videos: { frame_id: string; take: number; path: string; url: string }[]
  finalAds: { frame_id: string; url: string; path: string }[]
}

function pollinationsUrl(prompt: string, seed: number): string {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=576&height=1024&nologo=true&model=flux&seed=${seed}`
}

async function fetchImageOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return false
    await res.body?.cancel()
    return true
  } catch { return false }
}

async function generateFramesAndScripts(input: PipelineInput): Promise<{ frames: PipelineFrame[]; approvedFrames: PipelineFrame[]; scripts: Record<string, string[]>; analysis: any }> {
  // Agente analista: enriquece título/descrição e extrai imagem de referência
  const analysis = await analyzeProduct({
    productName: input.productName,
    productDescription: input.productDescription,
    imageUrl: input.imageUrl,
    productCategory: input.productCategory,
    marketplace: input.marketplace,
  })
  const enrichedDesc = analysis.enrichedDescription
  const finalTitle = analysis.title

  const forge = new PromptForgeFree()
  const numFrames = Math.min(input.numFrames || 3, 6)
  const frames: PipelineFrame[] = []

  for (let i = 0; i < numFrames; i++) {
    const productData = { name: finalTitle, description: enrichedDesc }
    const forged = forge.buildStyledPrompt(input.style || 'professional', input.productCategory || 'general', productData)
    const seed = Math.floor(Date.now() % 100000) + i * 111
    const url = pollinationsUrl(forged.prompt, seed)
    // sem validação bloqueante: confia na URL (pollinations gera on-demand) para ganhar velocidade
    const scored = scoreFrame(forged.prompt, url, forged.persona_name)
    frames.push({
      frame_id: `frame_${String(i + 1).padStart(2, '0')}`,
      prompt: forged.prompt,
      negative_prompt: forged.negative_prompt,
      persona_name: forged.persona_name,
      persona_dna: forged.persona_dna,
      scenario: forged.scenario,
      category: forged.category,
      score: scored.score,
      approved: scored.approved,
      imageUrl: url,
    })
    if (i < numFrames - 1) await new Promise(r => setTimeout(r, VibevidConfig.IMAGE_DELAY_MS))
  }

  const approvedFrames = input.mode === 'auto' ? frames.filter(f => f.approved) : frames

  const scripts: Record<string, string[]> = {}
  // scripts em paralelo
  await Promise.all(approvedFrames.map(async (frame) => {
    const takes = await generateAidaScripts(
      finalTitle,
      frame.category,
      frame.persona_name,
      parseInt(frame.frame_id.split('_')[1]) || 0
    )
    scripts[frame.frame_id] = takes
  }))

  return { frames, approvedFrames, scripts, analysis }
}

export async function runPipelineFree(input: PipelineInput): Promise<PipelineResult & { analysis?: any }> {
  const { frames, approvedFrames, scripts, analysis } = await generateFramesAndScripts(input)

  // Se withVideo === false, retorna rápido (~22-28s com análise) sem FFmpeg
  if (input.withVideo === false) {
    return { frames, approvedFrames, scripts, videos: [], finalAds: [], analysis }
  }

  // ETAPA 3: Vídeo 3-takes free (apenas 1 frame para demo)
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibevid-free-'))
  const videos: PipelineResult['videos'] = []
  const finalAds: PipelineResult['finalAds'] = []
  const framesToVideo = approvedFrames.slice(0, 1)

  for (const frame of framesToVideo) {
    const takes = scripts[frame.frame_id] || []
    const segmentPaths: string[] = []
    for (let t = 0; t < 3; t++) {
      const script = takes[t] || `Take ${t + 1} sobre ${input.productName}`
      const takePrompt = `${frame.prompt} - ${['Hook energy, bold framing', 'Value: benefits visible', 'CTA: urgent call to action'][t]}`
      const segPath = await generateTakeVideo(takePrompt, script, t, tmpDir, Date.now() % 100000 + t * 1000)
      segmentPaths.push(segPath)
      videos.push({ frame_id: frame.frame_id, take: t + 1, path: segPath, url: '' })
    }
    const publicDir = path.join(process.cwd(), 'public', 'generated')
    await fs.mkdir(publicDir, { recursive: true })
    const finalName = `vibevid_${frame.frame_id}_${Date.now()}.mp4`
    const finalPath = path.join(publicDir, finalName)
    const tmpFinal = path.join(tmpDir, finalName)
    await assembleAd(segmentPaths, tmpFinal)
    await fs.copyFile(tmpFinal, finalPath)
    const url = `/generated/${finalName}`
    finalAds.push({ frame_id: frame.frame_id, url, path: finalPath })
    videos.forEach(v => { if (v.frame_id === frame.frame_id) v.url = url })
  }

  return { frames, approvedFrames, scripts, videos, finalAds, analysis }
}

// Export para uso no endpoint de vídeo separado
export async function runVideoOnly(input: PipelineInput & { frame: PipelineFrame; scripts: string[] }): Promise<{ url: string; path: string }> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibevid-free-'))
  const segmentPaths: string[] = []
  for (let t = 0; t < 3; t++) {
    const script = input.scripts[t] || `Take ${t + 1}`
    const takePrompt = `${input.frame.prompt} - ${['Hook energy, bold framing', 'Value: benefits visible', 'CTA: urgent call to action'][t]}`
    const segPath = await generateTakeVideo(takePrompt, script, t, tmpDir, Date.now() % 100000 + t * 1000)
    segmentPaths.push(segPath)
  }
  const publicDir = path.join(process.cwd(), 'public', 'generated')
  await fs.mkdir(publicDir, { recursive: true })
  const finalName = `vibevid_${input.frame.frame_id}_${Date.now()}.mp4`
  const finalPath = path.join(publicDir, finalName)
  const tmpFinal = path.join(tmpDir, finalName)
  await assembleAd(segmentPaths, tmpFinal)
  await fs.copyFile(tmpFinal, finalPath)
  return { url: `/generated/${finalName}`, path: finalPath }
}
