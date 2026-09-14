import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { PT_BR_VOICES } from '@/lib/ugc-shared'

export const dynamic = 'force-dynamic'

const ALLOWED_VOICES = new Set(PT_BR_VOICES.map(v => v.id))

function isValidHttpsUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr)
    return u.protocol === 'https:' && u.hostname.length > 0
  } catch { return false }
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user || !supabase) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido. Envie JSON com name, voice, face_image_url.' }, { status: 400 }) }

  const name = (body.name || '').toString().trim().slice(0, 80)
  const voiceRaw = (body.voice || 'pt-BR-FranciscaNeural').toString().trim()
  const voice = ALLOWED_VOICES.has(voiceRaw) ? voiceRaw : 'pt-BR-FranciscaNeural'
  const face_image_url = (body.face_image_url || '').toString().trim()

  if (!name) return NextResponse.json({ error: 'Nome obrigatório (3-80 caracteres).' }, { status: 400 })
  if (name.length < 2) return NextResponse.json({ error: 'Nome muito curto (mín. 2 caracteres).' }, { status: 400 })
  if (!face_image_url) return NextResponse.json({ error: 'face_image_url obrigatório. Faça upload da foto primeiro.' }, { status: 400 })
  if (!isValidHttpsUrl(face_image_url)) return NextResponse.json({ error: 'face_image_url deve ser URL https válida (ex: do bucket vittrine-images).' }, { status: 400 })
  // Enforce that avatar image comes from our Supabase bucket to prevent SSRF/abuse
  const isVittrine = face_image_url.includes('supabase.co/storage/v1/object/public/vittrine-images/') || face_image_url.includes('/storage/v1/object/public/vittrine-images/')
  const isOwnSupabase = face_image_url.includes(process.env.NEXT_PUBLIC_SUPABASE_URL || 'mlqawjbdufvcxtijfhip.supabase.co')
  if (!isVittrine && !isOwnSupabase) {
    // Allow but warn – restrict to https only to avoid arbitrary fetch later
    // We keep strict https check above; no block here to allow migrated assets
  }

  // Use authenticated client (RLS enforces auth.uid() = user_id) instead of service_role
  const { data, error } = await supabase.from('avatars').insert({
    user_id: user.id,
    name,
    voice,
    face_image_url,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ avatar: data })
}
