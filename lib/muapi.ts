const MUAPI_BASE = 'https://api.muapi.ai/api/v1'
const FILE_UPLOAD_TIMEOUT_MS = 300_000

export interface MuapiVideoRequest {
  prompt: string
  duration: number
  aspectRatio?: string
  negativePrompt?: string
  webhook?: string
}

export interface MuapiVideoResult {
  requestId: string
  status: 'processing' | 'completed' | 'failed'
  outputs: string[]
  error?: string | null
}

function getApiKey(passed?: string | null): string {
  // 1) explícito (BYOK via header x-api-key ou localStorage repassado)
  if (passed && passed.trim().length > 8) return passed.trim()
  // 2) server env
  const envKey = process.env.MUAPI_API_KEY || process.env.MUAPI_KEY
  if (envKey && envKey.trim().length > 8) return envKey.trim()
  throw new Error('MUAPI_API_KEY não configurada — informe via header x-api-key (BYOK) ou .env MUAPI_API_KEY')
}

function parseError(data: any): string {
  if (!data) return 'erro desconhecido'
  if (typeof data === 'string') return data
  if (data.error?.message) return String(data.error.message)
  if (data.detail?.error?.message) return String(data.detail.error.message)
  if (typeof data.detail === 'string') return data.detail
  if (data.detail?.message) return String(data.detail.message)
  if (data.message) return String(data.message)
  try { return JSON.stringify(data).slice(0, 300) } catch { return 'erro desconhecido' }
}

export async function submitMuapiVideo(
  model: string,
  params: MuapiVideoRequest,
  apiKeyOverride?: string | null
): Promise<string> {
  const endpoint = `${MUAPI_BASE}/${model}`

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    duration: params.duration,
  }
  if (params.aspectRatio) body.aspect_ratio = params.aspectRatio
  if (params.negativePrompt) body.negative_prompt = params.negativePrompt

  const url = params.webhook ? `${endpoint}?webhook=${encodeURIComponent(params.webhook)}` : endpoint
  const key = getApiKey(apiKeyOverride)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data: any = await response.json().catch(() => ({}))

  if (!response.ok || !data?.request_id) {
    if (response.status === 401) throw new Error(`MuAPI 401 não autorizado: verifique sua API key (x-api-key). ${parseError(data)}`)
    if (response.status === 429) throw new Error(`MuAPI 429 rate limit: aguarde e tente novamente. ${parseError(data)}`)
    if (response.status === 400) throw new Error(`MuAPI 400 requisição inválida: ${parseError(data)}`)
    throw new Error(
      `MuAPI falhou (${response.status}): ${parseError(data)}`
    )
  }

  return data.request_id
}

export async function getMuapiVideoResult(
  requestId: string,
  apiKeyOverride?: string | null
): Promise<MuapiVideoResult> {
  const key = getApiKey(apiKeyOverride)
  const response = await fetch(`${MUAPI_BASE}/predictions/${requestId}/result`, {
    headers: { 'x-api-key': key },
  })

  const data: any = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) throw new Error(`MuAPI poll 401 não autorizado — API key inválida ou expirada`)
    if (response.status === 404) throw new Error(`MuAPI poll 404 — requestId não encontrado: ${requestId}`)
    if (response.status === 429) throw new Error(`MuAPI poll 429 rate limit — aguarde 5s e tente novamente`)
    if (response.status === 400) throw new Error(`MuAPI poll 400 — request inválida: ${parseError(data)}`)
    throw new Error(`MuAPI poll falhou (${response.status}): ${parseError(data)}`)
  }

  return {
    requestId,
    status: data.status,
    outputs: data.outputs || [],
    error: data.error || null,
  }
}

export async function getMuapiBalance(apiKeyOverride?: string | null): Promise<number> {
  const key = getApiKey(apiKeyOverride)
  const response = await fetch(`${MUAPI_BASE}/account/balance`, {
    headers: { 'x-api-key': key },
  })
  if (!response.ok) return 0
  const data: any = await response.json().catch(() => ({}))
  return data?.balance ?? 0
}

// Upload compatível com BYOK + progress via XHR quando no browser
export function uploadMuapiFile(
  file: File,
  apiKeyOverride?: string | null,
  onProgress?: (percent: number) => void
): Promise<string> {
  const key = getApiKey(apiKeyOverride)
  return new Promise((resolve, reject) => {
    const url = `${MUAPI_BASE}/upload_file`
    const form = new FormData()
    form.append('file', file)

    // Browser path com progresso
    if (typeof window !== 'undefined' && typeof XMLHttpRequest !== 'undefined') {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('x-api-key', key)
      xhr.timeout = FILE_UPLOAD_TIMEOUT_MS
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.min(Math.round((e.loaded / e.total) * 100), 99))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            const fileUrl = (data as any).url || (data as any).file_url || (data as any).data?.url
            if (!fileUrl) reject(new Error('No URL returned from MuAPI upload'))
            else { onProgress?.(100); resolve(fileUrl) }
          } catch { reject(new Error('Failed to parse MuAPI upload response')) }
        } else {
          let detail = xhr.statusText
          try { const e = JSON.parse(xhr.responseText); detail = e.detail || e.error?.message || detail } catch {}
          if (xhr.status === 401) reject(new Error(`MuAPI upload 401 não autorizado — verifique x-api-key. ${detail}`))
          else if (xhr.status === 429) reject(new Error(`MuAPI upload 429 rate limit. ${detail}`))
          else if (xhr.status === 400) reject(new Error(`MuAPI upload 400 inválido. ${detail}`))
          else reject(new Error(`MuAPI upload failed ${xhr.status}: ${detail}`))
        }
      }
      xhr.onerror = () => reject(new Error('Network error during MuAPI upload'))
      xhr.ontimeout = () => reject(new Error('MuAPI upload timed out (5min)'))
      xhr.send(form)
      return
    }

    // Node fallback (sem progresso real)
    fetch(url, { method: 'POST', headers: { 'x-api-key': key }, body: form as any })
      .then(async (r) => {
        const j: any = await r.json().catch(() => ({}))
        if (!r.ok) {
          if (r.status === 401) throw new Error(`MuAPI upload 401 não autorizado`)
          if (r.status === 429) throw new Error(`MuAPI upload 429 rate limit`)
          throw new Error(`MuAPI upload failed (${r.status}): ${parseError(j)}`)
        }
        const fileUrl = j.url || j.file_url || j.data?.url
        if (!fileUrl) throw new Error('No URL returned from MuAPI upload')
        onProgress?.(100)
        resolve(fileUrl)
      })
      .catch(reject)
  })
}

// Polling robusto para uso server-side (lida com 429 backoff e 5xx retry)
export async function pollMuapiResultWithRetry(
  requestId: string,
  apiKeyOverride?: string | null,
  opts: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<MuapiVideoResult> {
  const { maxAttempts = 90, intervalMs = 2000 } = opts
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await getMuapiVideoResult(requestId, apiKeyOverride)
      if (result.status === 'completed' || result.status === 'failed') return result
      // processing -> wait
    } catch (e: any) {
      const msg = String(e?.message || '')
      if (msg.includes('429') && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 5000 + Math.random() * 2000))
        continue
      }
      if ((msg.includes('500') || msg.includes('502') || msg.includes('503')) && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, intervalMs))
        continue
      }
      throw e
    }
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error(`MuAPI polling timeout após ${maxAttempts} tentativas (requestId ${requestId})`)
}
