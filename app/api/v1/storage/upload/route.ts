import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, getServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { user } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  const folder = (form.get('folder') as string) || 'uploads/avatars'
  if (!file) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Máximo 10MB' }, { status: 400 })

  const ext = file.name.split('.').pop() || 'jpg'
  const fpath = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const supabase = getServiceClient()
  const arrayBuffer = await file.arrayBuffer()
  const { error } = await supabase.storage.from('vittrine-images').upload(fpath, Buffer.from(arrayBuffer), {
    contentType: file.type || `image/${ext}`,
    cacheControl: '3600',
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = supabase.storage.from('vittrine-images').getPublicUrl(fpath)
  return NextResponse.json({ path: fpath, publicUrl: data.publicUrl })
}
