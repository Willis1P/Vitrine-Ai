import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))

  if (!user || !supabase) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const id = request.nextUrl.pathname.split('/').filter(Boolean).pop()

  if (!id) {
    return NextResponse.json({ error: 'ID não informado' }, { status: 400 })
  }

  const { data: content, error } = await supabase
    .from('generated_content')
    .select('id, type, product_name, prompt_used, result_url, result_data, credits_used, status, error_message, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('type', 'video')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!content) {
    return NextResponse.json({ error: 'Vídeo não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ ...content })
}