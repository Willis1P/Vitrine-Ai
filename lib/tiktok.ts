import { promises as fs } from 'fs'
import path from 'path'

const TIKTOK_API = 'https://open.tiktokapis.com/v2'
const TIKTOK_AUTH = 'https://www.tiktok.com/v2/auth/authorize/'
const CHUNK_SIZE = 1024 * 1024
const MAX_VIDEO_SIZE = 64 * 1024 * 1024

export type TikTokConfig = {
  clientKey: string
  clientSecret: string
  redirectUri: string
}

export type TikTokAuthOptions = {
  scope?: string
  forceReauth?: boolean
}

type TikTokTokenResponse = {
  open_id: string
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

type TikTokError = {
  code: string
  message: string
  log_id?: string
}

type TikTokApiResponse<T = Record<string, unknown>> = {
  data?: T
  error?: TikTokError
}

export type PrivacyLevel = 'SELF_ONLY' | 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS'

const ERROR_MESSAGES: Record<string, string> = {
  ok: 'Sucesso',
  error: 'Erro desconhecido do TikTok',
  access_token_invalid: 'Token de acesso inválido ou expirado. Faça login novamente.',
  access_token_expired: 'Token de acesso expirado. Use o refresh_token para renovar.',
  invalid_params: 'Parâmetros inválidos na requisição.',
  insufficient_scope: 'Permissões insuficientes. O app precisa das scopes: video.upload, video.publish.',
  rate_limit_exceeded: 'Limite de requisições atingido. Tente novamente em alguns minutos.',
  video_upload_failed: 'Falha no upload do vídeo. Verifique o arquivo e tente novamente.',
  video_too_large: 'O vídeo excede o tamanho máximo permitido.',
  publish_fail: 'Falha ao publicar o vídeo.',
  internal_error: 'Erro interno do TikTok. Tente novamente mais tarde.',
  unauthorized: 'Acesso não autorizado. Verifique suas credenciais.',
}

function mapTikTokError(error?: TikTokError): string {
  if (!error) return 'Erro desconhecido do TikTok'
  return ERROR_MESSAGES[error.code] || `Erro TikTok [${error.code}]: ${error.message}`
}

export function getTikTokConfig(): TikTokConfig | null {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  const redirectUri = process.env.TIKTOK_REDIRECT_URI
  if (!clientKey || !clientSecret || !redirectUri) return null
  return { clientKey, clientSecret, redirectUri }
}

export function buildAuthUrl(state: string, opts?: TikTokAuthOptions): string {
  const config = getTikTokConfig()
  if (!config) throw new Error('TikTok não configurado. Defina TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET e TIKTOK_REDIRECT_URI.')
  const scope = opts?.scope || 'user.info.basic,video.upload,video.publish'
  const params = new URLSearchParams({
    client_key: config.clientKey,
    scope,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    state,
  })
  if (opts?.forceReauth) params.set('force_reauth', '1')
  return `${TIKTOK_AUTH}?${params.toString()}`
}

export async function exchangeCodeForToken(code: string): Promise<{
  openId: string
  accessToken: string
  refreshToken: string
  expiresIn: number
}> {
  const config = getTikTokConfig()
  if (!config) throw new Error('TikTok não configurado. Defina as variáveis de ambiente necessárias.')

  const body = new URLSearchParams({
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  })

  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data: TikTokApiResponse<TikTokTokenResponse> = await res.json()

  if (data.error && data.error.code !== 'ok') {
    throw new Error(mapTikTokError(data.error))
  }

  if (!data.data) throw new Error('Resposta inválida do TikTok ao trocar código por token.')

  return {
    openId: data.data.open_id,
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    expiresIn: data.data.expires_in,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  openId: string
  accessToken: string
  refreshToken: string
  expiresIn: number
}> {
  const config = getTikTokConfig()
  if (!config) throw new Error('TikTok não configurado. Defina as variáveis de ambiente necessárias.')

  const body = new URLSearchParams({
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  const data: TikTokApiResponse<TikTokTokenResponse> = await res.json()

  if (data.error && data.error.code !== 'ok') {
    throw new Error(mapTikTokError(data.error))
  }

  if (!data.data) throw new Error('Resposta inválida do TikTok ao renovar token.')

  return {
    openId: data.data.open_id,
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    expiresIn: data.data.expires_in,
  }
}

export async function publishVideo(post: {
  accessToken: string
  openId: string
  videoUrl: string
  title?: string
  privacyLevel?: PrivacyLevel
}): Promise<{ publishId: string; status: string }> {
  const videoPath = post.videoUrl.startsWith('/')
    ? path.join(process.cwd(), 'public', post.videoUrl)
    : path.resolve(post.videoUrl)

  const stat = await fs.stat(videoPath).catch(() => null)
  if (!stat) throw new Error(`Vídeo não encontrado: ${post.videoUrl}`)
  if (stat.size > MAX_VIDEO_SIZE) {
    throw new Error(`Vídeo muito grande (${(stat.size / 1024 / 1024).toFixed(1)}MB). Máximo permitido: 64MB.`)
  }

  const videoBuffer = await fs.readFile(videoPath)
  const totalSize = videoBuffer.length
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE)

  const initBody = new FormData()
  const sourceInfo = {
    source: 'FILE_UPLOAD',
    video_size: totalSize,
    video_total_chunk_count: totalChunks,
  }
  initBody.append('publish_info', new Blob([JSON.stringify(sourceInfo)], { type: 'application/json' }))

  const initRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${post.accessToken}`,
    },
    body: initBody,
  })

  const initData: TikTokApiResponse<{ publish_id: string; upload_url: string }> = await initRes.json()

  if (initData.error && initData.error.code !== 'ok') {
    throw new Error(mapTikTokError(initData.error))
  }

  if (!initData.data) throw new Error('Resposta inválida ao iniciar upload no TikTok.')

  const { publish_id: publishId, upload_url: uploadUrl } = initData.data

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, totalSize)
    const chunk = videoBuffer.subarray(start, end)
    const contentRange = `bytes ${start}-${end - 1}/${totalSize}`

    const chunkRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': contentRange,
        'Content-Length': String(chunk.length),
      },
      body: chunk,
    })

    if (!chunkRes.ok) {
      const chunkText = await chunkRes.text().catch(() => '')
      throw new Error(`Falha no upload do chunk ${i + 1}/${totalChunks}: ${chunkRes.status} ${chunkText}`)
    }
  }

  const title = (post.title || '').trim().slice(0, 150)
  const privacy = post.privacyLevel || 'PUBLIC_TO_EVERYONE'

  const publishBody = new FormData()
  const postInfo = {
    publish_id: publishId,
    title,
    privacy_level: privacy,
  }
  publishBody.append('publish_info', new Blob([JSON.stringify(postInfo)], { type: 'application/json' }))

  const publishRes = await fetch(`${TIKTOK_API}/post/publish/video/publish/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${post.accessToken}`,
    },
    body: publishBody,
  })

  const publishData: TikTokApiResponse<{ publish_id: string }> = await publishRes.json()

  if (publishData.error && publishData.error.code !== 'ok') {
    throw new Error(mapTikTokError(publishData.error))
  }

  const status = await pollVideoStatus(publishId, post.accessToken)

  return { publishId, status }
}

export async function pollVideoStatus(
  publishId: string,
  accessToken: string,
  maxAttempts = 20,
  delayMs = 3000,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${TIKTOK_API}/post/publish/video/status/fetch/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publish_id: publishId }),
    })

    const data: TikTokApiResponse<{ status: string; fail_reason?: string }> = await res.json()

    if (data.error && data.error.code !== 'ok') {
      throw new Error(mapTikTokError(data.error))
    }

    const status = data.data?.status || 'UNKNOWN'

    if (status === 'PUBLISHED' || status === 'FAILED') return status

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return 'PROCESSING_UPLOAD'
}

export async function getVideoStatus(publishId: string, accessToken: string): Promise<{
  status: string
  failReason?: string
}> {
  const res = await fetch(`${TIKTOK_API}/post/publish/video/status/fetch/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ publish_id: publishId }),
  })

  const data: TikTokApiResponse<{ status: string; fail_reason?: string }> = await res.json()

  if (data.error && data.error.code !== 'ok') {
    throw new Error(mapTikTokError(data.error))
  }

  return {
    status: data.data?.status || 'UNKNOWN',
    failReason: data.data?.fail_reason,
  }
}
