import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import {
  getTikTokConfig,
  buildAuthUrl,
  exchangeCodeForToken,
  publishVideo,
  getVideoStatus,
  type PrivacyLevel,
} from '@/lib/tiktok'

export const dynamic = 'force-dynamic'

const HINT_CONFIG_MISSING = 'TikTok Content Posting API ainda não configurada. Solicite acesso em https://developers.tiktok.com/ e configure TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET e TIKTOK_REDIRECT_URI nas variáveis de ambiente.'

function ensureConfig() {
  const config = getTikTokConfig()
  if (!config) {
    return NextResponse.json(
      { error: 'TikTok não configurado', hint: HINT_CONFIG_MISSING },
      { status: 501 },
    )
  }
  return null
}

export async function POST(request: NextRequest) {
  const { user } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const action = body.action as string

  if (action === 'auth-url') {
    const configMissing = ensureConfig()
    if (configMissing) return configMissing

    const state = typeof body.state === 'string' && body.state.trim()
      ? body.state.trim().slice(0, 256)
      : `vitrine_${user.id}_${Date.now()}`

    const authUrl = buildAuthUrl(state)
    return NextResponse.json({ authUrl, state })
  }

  if (action === 'token') {
    const configMissing = ensureConfig()
    if (configMissing) return configMissing

    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!code) return NextResponse.json({ error: 'Código OAuth é obrigatório' }, { status: 400 })

    try {
      const result = await exchangeCodeForToken(code)
      return NextResponse.json({
        ...result,
        warning: 'ATENÇÃO: Em produção, armazene tokens server-side com criptografia. No MVP, armazenar no localStorage é aceitável.',
      })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Falha ao trocar código por token' }, { status: 502 })
    }
  }

  if (action === 'publish') {
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : ''
    const openId = typeof body.openId === 'string' ? body.openId.trim() : ''
    const videoUrl = typeof body.videoUrl === 'string' ? body.videoUrl.trim() : ''

    if (!accessToken) return NextResponse.json({ error: 'accessToken é obrigatório' }, { status: 400 })
    if (!openId) return NextResponse.json({ error: 'openId é obrigatório' }, { status: 400 })
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl é obrigatório' }, { status: 400 })

    const title = typeof body.title === 'string' ? body.title.trim() : undefined
    const validPrivacy: PrivacyLevel[] = ['SELF_ONLY', 'PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS']
    const privacyLevel = validPrivacy.includes(body.privacyLevel) ? body.privacyLevel : undefined

    try {
      const result = await publishVideo({
        accessToken,
        openId,
        videoUrl,
        title,
        privacyLevel,
      })
      return NextResponse.json(result)
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Falha ao publicar vídeo no TikTok' }, { status: 502 })
    }
  }

  if (action === 'status') {
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : ''
    const publishId = typeof body.publishId === 'string' ? body.publishId.trim() : ''

    if (!accessToken) return NextResponse.json({ error: 'accessToken é obrigatório' }, { status: 400 })
    if (!publishId) return NextResponse.json({ error: 'publishId é obrigatório' }, { status: 400 })

    try {
      const result = await getVideoStatus(publishId, accessToken)
      return NextResponse.json(result)
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Falha ao verificar status do vídeo' }, { status: 502 })
    }
  }

  return NextResponse.json(
    { error: 'Ação inválida', hint: 'Ações disponíveis: auth-url, token, publish, status' },
    { status: 400 },
  )
}
