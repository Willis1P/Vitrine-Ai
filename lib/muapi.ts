const MUAPI_BASE = 'https://api.muapi.ai/api/v1'

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

function getApiKey(): string {
  const key = process.env.MUAPI_API_KEY
  if (!key) throw new Error('MUAPI_API_KEY não configurada')
  return key
}

export async function submitMuapiVideo(model: string, params: MuapiVideoRequest): Promise<string> {
  const endpoint = `${MUAPI_BASE}/${model}`

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    duration: params.duration,
  }
  if (params.aspectRatio) body.aspect_ratio = params.aspectRatio
  if (params.negativePrompt) body.negative_prompt = params.negativePrompt

  const url = params.webhook ? `${endpoint}?webhook=${encodeURIComponent(params.webhook)}` : endpoint

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok || !data?.request_id) {
    throw new Error(
      `MuAPI falhou (${response.status}): ${data?.error?.message || data?.detail?.error?.message || 'erro desconhecido'}`
    )
  }

  return data.request_id
}

export async function getMuapiVideoResult(requestId: string): Promise<MuapiVideoResult> {
  const response = await fetch(`${MUAPI_BASE}/predictions/${requestId}/result`, {
    headers: { 'x-api-key': getApiKey() },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`MuAPI poll falhou (${response.status}): ${data?.error?.message || 'erro desconhecido'}`)
  }

  return {
    requestId,
    status: data.status,
    outputs: data.outputs || [],
    error: data.error || null,
  }
}

export async function getMuapiBalance(): Promise<number> {
  const response = await fetch(`${MUAPI_BASE}/account/balance`, {
    headers: { 'x-api-key': getApiKey() },
  })
  if (!response.ok) return 0
  const data = await response.json()
  return data?.balance ?? 0
}