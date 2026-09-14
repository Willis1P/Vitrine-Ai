// @ts-nocheck
/**
 * Vitrine-Ai MuAPI Studio adapter
 * Ported from Open-Generative-AI packages/studio/src/muapi.js + utils/generationLifecycle.js
 * Pattern: x-api-key header, server .env MUAPI_API_KEY, client BYOK via localStorage muapi_key
 * Fallback: Pollinations free (flux) when no MuAPI key.
 */

const MUAPI_UPSTREAM = 'https://api.muapi.ai'
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt'
const FILE_UPLOAD_TIMEOUT_MS = 300_000

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) return '/api'
  return MUAPI_UPSTREAM
}

function getStoredKey(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem('muapi_key') || localStorage.getItem('MUAPI_API_KEY') } catch { return null }
}

export function getEffectiveMuapiKey(): string | null {
  // Client BYOK takes precedence
  const stored = getStoredKey()
  if (stored) return stored
  // Next public expose if admin configured for client (optional)
  const pub = (typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_MUAPI_API_KEY as string | undefined) : undefined)
  if (pub) return pub
  return null
}

export function getServerMuapiKey(): string | null {
  return process.env.MUAPI_API_KEY || process.env.MUAPI_KEY || null
}

function resolveApiKey(passed?: string | null): string | null {
  if (passed) return passed
  const stored = getStoredKey()
  if (stored) return stored
  const serverKey = typeof window === 'undefined' ? getServerMuapiKey() : null
  if (serverKey) return serverKey
  return null
}

function notifyAuthRequired(status: number, detail: string) {
  if (typeof window === 'undefined') return
  if (status !== 401 && status !== 403) return
  window.dispatchEvent(new CustomEvent('muapi:auth-required', { detail: { status, message: detail } }))
}

// ---- Polling lifecycle (from utils/generationLifecycle) ----
const SUCCESS_STATUSES = new Set(['completed', 'succeeded', 'success'])
const FAILURE_STATUSES = new Set(['failed', 'error', 'cancelled', 'canceled'])
const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function pollForGenerationResult({
  baseUrl = getBaseUrl(),
  requestId,
  apiKey,
  maxAttempts = 900,
  interval = 2000,
  onAuthRequired = notifyAuthRequired,
}: {
  baseUrl?: string
  requestId: string
  apiKey: string
  maxAttempts?: number
  interval?: number
  onAuthRequired?: (s:number,d:string)=>void
}) {
  const pollUrl = `${baseUrl}/api/v1/predictions/${requestId}/result`
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await wait(interval)
    let response: Response
    try {
      response = await fetch(pollUrl, { headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey } })
    } catch (e) {
      if (attempt === maxAttempts) throw e
      continue
    }
    if (!response.ok) {
      const detail = await response.text()
      if (response.status === 429 && attempt < maxAttempts) {
        await wait(5000 + Math.random() * 2000)
        continue
      }
      if (response.status === 400) throw new Error(`Poll Failed 400 requisição inválida: ${detail.slice(0,180)}`)
      if (response.status === 401 || response.status === 403) {
        onAuthRequired?.(response.status, detail)
        throw new Error(`Poll Failed 401/403 não autorizado — verifique sua API key (x-api-key): ${detail.slice(0,180)}`)
      }
      if (response.status >= 500 && attempt < maxAttempts) continue
      onAuthRequired?.(response.status, detail)
      throw new Error(`Poll Failed: ${response.status} - ${detail.slice(0,180)}`)
    }
    let result: any
    try { result = await response.json() } catch { if (attempt===maxAttempts) throw new Error('Invalid JSON'); continue }
    const status = String(result.status || '').toLowerCase()
    if (SUCCESS_STATUSES.has(status)) return result
    if (FAILURE_STATUSES.has(status)) {
      const msg = result?.error?.message || result?.error || result?.message || 'Unknown error'
      const err: any = new Error(`Generation failed: ${msg}`)
      err.generationResult = result
      err.requestId = requestId
      throw err
    }
  }
  throw new Error(`Generation timed out after polling. Request ID: ${requestId}`)
}

async function pollForResult(requestId: string, key: string, maxAttempts = 900, interval = 2000) {
  return pollForGenerationResult({ baseUrl: getBaseUrl(), requestId, apiKey: key, maxAttempts, interval })
}

function normalizePredictionResult(submitData: any, result: any, outputUrl: string | undefined) {
  const requestId = submitData?.request_id || submitData?.id || result?.request_id || result?.id
  return { ...result, ...(requestId ? { request_id: requestId } : {} ), url: outputUrl }
}

export async function submitAndPoll(endpoint: string, payload: Record<string,unknown>, key: string, onRequestId?: (id:string)=>void, maxAttempts = 60) {
  const url = `${getBaseUrl()}/api/v1/${endpoint}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errText = await response.text()
    if (response.status === 401 || response.status === 403) notifyAuthRequired(response.status, errText)
    if (response.status === 401) throw new Error(`MuAPI 401 não autorizado — verifique sua API key (x-api-key/BYOK). ${errText.slice(0,180)}`)
    if (response.status === 429) throw new Error(`MuAPI 429 rate limit — aguarde e tente novamente. ${errText.slice(0,180)}`)
    if (response.status === 400) throw new Error(`MuAPI 400 requisição inválida: ${errText.slice(0,180)}`)
    notifyAuthRequired(response.status, errText)
    throw new Error(`MuAPI Request Failed: ${response.status} ${response.statusText} - ${errText.slice(0,180)}`)
  }
  const submitData: any = await response.json()
  const requestId = submitData.request_id || submitData.id
  if (!requestId) return submitData
  if (onRequestId) onRequestId(requestId)
  const result = await pollForResult(requestId, key, maxAttempts, 2000)
  const outputUrl = result.outputs?.[0] || result.url || result.output?.url
  return normalizePredictionResult(submitData, result, outputUrl)
}

// ---- Pollinations free fallback ----
function pollinationsUrl(prompt: string, opts: { width?: number; height?: number; model?: string; seed?: number } = {}) {
  const w = opts.width || 1024
  const h = opts.height || 1024
  const model = opts.model || 'flux'
  const seed = opts.seed ?? Math.floor(Math.random()*99999)
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&model=${model}&seed=${seed}`
}

export async function generateImageFree(prompt: string, opts: any = {}) {
  const url = pollinationsUrl(prompt, opts)
  // lightweight validation: fetch head
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) as any })
    if (!r.ok) throw new Error('pollinations head failed')
  } catch { /* ignore, return URL anyway - client will load */ }
  return { url, provider: 'pollinations-free' as const }
}

// ---- High-level generators ----
export async function generateImage(apiKey: string | null | undefined, params: any) {
  const key = resolveApiKey(apiKey as string)
  // Lazy import model info to avoid circular deps if needed
  let modelInfo: any = null
  try {
    const m = await import('./studio/models')
    const fn = (m as any).getModelById
    if (fn && params.model) modelInfo = fn(params.model)
  } catch {}
  // If no MuAPI key -> free fallback
  if (!key) {
    return generateImageFree(params.prompt || '', { width: 1024, height: 1024 })
  }
  const endpoint = modelInfo?.endpoint || params.model || 'flux-dev'
  const payload: any = { prompt: params.prompt }
  if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio
  if (params.resolution) payload.resolution = params.resolution
  if (params.width) payload.width = params.width
  if (params.height) payload.height = params.height
  if (params.negative_prompt) payload.negative_prompt = params.negative_prompt
  if (params.num_images) payload.num_images = params.num_images
  if (params.image_url) { payload.image_url = params.image_url; payload.strength = params.strength || 0.6 }
  if (params.seed && params.seed !== -1) payload.seed = params.seed
  return submitAndPoll(endpoint, payload, key, params.onRequestId, 60)
}

export async function generateVideo(apiKey: string | null | undefined, params: any) {
  const key = resolveApiKey(apiKey as string)
  if (!key) throw new Error('MUAPI_API_KEY ausente - configure em .env.local ou informe sua chave (BYOK) no Studio')
  // modelInfo optional
  let modelInfo: any = null
  try {
    const m = await import('./studio/models')
    const fn = (m as any).getVideoModelById
    if (fn && params.model) modelInfo = fn(params.model)
  } catch {}
  const endpoint = modelInfo?.endpoint || params.model || process.env.MUAPI_VIDEO_MODEL || 'seedance-lite-t2v'
  const payload: any = {}
  if (params.prompt) payload.prompt = params.prompt
  if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio
  if (params.duration) payload.duration = params.duration
  if (params.resolution) payload.resolution = params.resolution
  if (typeof params.generate_audio === 'boolean') payload.generate_audio = params.generate_audio
  if (params.image_url) payload.image_url = params.image_url
  if (params.images_list) payload.images_list = params.images_list
  if (params.negative_prompt) payload.negative_prompt = params.negative_prompt
  return submitAndPoll(endpoint, payload, key, params.onRequestId, 900)
}

export async function generateI2V(apiKey: string | null | undefined, params: any) {
  const key = resolveApiKey(apiKey as string)
  if (!key) throw new Error('MUAPI_API_KEY ausente para I2V')
  let modelInfo: any = null
  try { const m = await import('./studio/models'); modelInfo = (m as any).getI2VModelById?.(params.model) } catch {}
  const endpoint = modelInfo?.endpoint || params.model
  const payload: any = { prompt: params.prompt }
  if (params.image_url) payload.image_url = params.image_url
  if (params.images_list) payload.images_list = params.images_list
  if (params.aspect_ratio) payload.aspect_ratio = params.aspect_ratio
  if (params.duration) payload.duration = params.duration
  if (params.resolution) payload.resolution = params.resolution
  return submitAndPoll(endpoint, payload, key, params.onRequestId, 900)
}

export async function processLipSync(apiKey: string | null | undefined, params: any) {
  const key = resolveApiKey(apiKey as string)
  if (!key) throw new Error('MUAPI_API_KEY ausente para LipSync')
  let modelInfo: any = null
  try { const m = await import('./studio/models'); modelInfo = (m as any).getLipSyncModelById?.(params.model) } catch {}
  const endpoint = modelInfo?.endpoint || params.model
  const payload: any = {}
  if (params.audio_url) payload.audio_url = params.audio_url
  if (params.image_url) payload.image_url = params.image_url
  if (params.video_url) payload.video_url = params.video_url
  return submitAndPoll(endpoint, payload, key, params.onRequestId, 900)
}

export function uploadFile(apiKey: string | null | undefined, file: File, onProgress?: (p:number)=>void): Promise<string> {
  const key = resolveApiKey(apiKey as string)
  if (!key) return Promise.reject(new Error('MUAPI_API_KEY ausente para upload'))
  return new Promise((resolve, reject) => {
    const url = `${getBaseUrl()}/api/v1/upload_file`
    const formData = new FormData()
    formData.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('x-api-key', key)
    xhr.timeout = FILE_UPLOAD_TIMEOUT_MS
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.min(Math.round((e.loaded/e.total)*100), 99))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText)
          const fileUrl = data.url || data.file_url || data.data?.url
          if (!fileUrl) reject(new Error('No URL returned from file upload')); else { onProgress?.(100); resolve(fileUrl) }
        } catch { reject(new Error('Failed to parse upload response')) }
      } else {
        let detail = xhr.statusText
        try { const e = JSON.parse(xhr.responseText); detail = e.detail || detail } catch {}
        notifyAuthRequired(xhr.status, detail)
        reject(new Error(`File upload failed: ${xhr.status} - ${detail}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during file upload'))
    xhr.ontimeout = () => reject(new Error('File upload timed out'))
    xhr.send(formData)
  })
}

export async function getUserBalance(apiKey?: string | null): Promise<any> {
  const key = resolveApiKey(apiKey as string)
  if (!key) throw new Error('MUAPI_API_KEY ausente')
  const res = await fetch(`${getBaseUrl()}/api/v1/account/balance`, { headers: { 'Content-Type': 'application/json', 'x-api-key': key } })
  if (!res.ok) {
    const t = await res.text()
    notifyAuthRequired(res.status, t)
    throw new Error(`Failed to fetch balance: ${res.status} - ${t.slice(0,120)}`)
  }
  return res.json()
}

// Helpers for Vitrine pipeline: attempt MuAPI then fallback free
export async function vitrineGenerateImage(prompt: string, opts: { modelId?: string; aspect_ratio?: string } = {}) {
  const key = getEffectiveMuapiKey() || getServerMuapiKey()
  if (key) {
    try { return await generateImage(key, { model: opts.modelId || 'flux-dev', prompt, aspect_ratio: opts.aspect_ratio }) } catch (e) { console.warn('MuAPI image failed, fallback free', e); }
  }
  return generateImageFree(prompt)
}

export function hasMuapiKey(): boolean {
  return !!(getEffectiveMuapiKey() || getServerMuapiKey())
}
