import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { runVideoOnly } from '@/lib/vibevid/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user || !supabase) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const frame = body.frame
  const scripts: string[] = body.scripts
  const productName = (body.productName || 'Produto').trim()
  const contentId = body.contentId as string | undefined

  if (!frame?.prompt || !scripts || scripts.length < 3) {
    return NextResponse.json({ error: 'Frame e 3 takes AIDA obrigatórios' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('unlimited').eq('id', user.id).maybeSingle()
  const unlimited = profile?.unlimited ?? false
  const REQUIRED_VIDEO = 2
  if (!unlimited) {
    const { data: credits } = await supabase.rpc('get_user_credits', { p_user_id: user.id })
    if (typeof credits !== 'number' || credits < REQUIRED_VIDEO) {
      return NextResponse.json({ error: `Vídeo requer ${REQUIRED_VIDEO} créditos.` }, { status: 402 })
    }
  }

  try {
    const result = await runVideoOnly({ productName, frame, scripts, mode: 'interactive', numFrames: 1 } as any)

    // atualiza generated_content se houver contentId
    if (contentId) {
      const { data: existing } = await supabase.from('generated_content').select('result_data').eq('id', contentId).maybeSingle()
      const prevData: any = existing?.result_data || {}
      const finalAds = [...(prevData.finalAds || []), { frame_id: frame.frame_id, url: result.url }]
      await supabase.from('generated_content').update({
        result_url: result.url,
        result_data: { ...prevData, finalAds },
      }).eq('id', contentId)
    }

    if (!unlimited) {
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: REQUIRED_VIDEO,
        type: 'usage',
        description: `Vídeo Vibevid Free: ${frame.frame_id}`,
        reference_type: 'video',
        reference_id: contentId || null,
      })
    }

    return NextResponse.json({ url: result.url, path: result.path, credits_used: unlimited ? 0 : REQUIRED_VIDEO })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao gerar vídeo' }, { status: 500 })
  }
}
