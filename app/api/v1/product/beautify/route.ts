import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { beautifyProduct, isCv2Available } from '@/lib/product-beautify'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user || !supabase) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
  if (!imageUrl) {
    return NextResponse.json({ error: 'Informe a URL da imagem do produto (imageUrl)' }, { status: 400 })
  }

  const backdrop = typeof body.backdrop === 'string' && body.backdrop.trim() ? body.backdrop.trim() : 'marble'
  const productName =
    typeof body.productName === 'string' && body.productName.trim() ? body.productName.trim() : 'Fotografia de produto'

  if (!(await isCv2Available())) {
    return NextResponse.json(
      { error: 'Beautificação de produto indisponível: OpenCV (cv2) não está disponível no servidor' },
      { status: 501 }
    )
  }

  let contentId: string | undefined
  try {
    const { data } = await supabase
      .from('generated_content')
      .insert({
        user_id: user.id,
        type: 'product-shot',
        product_name: productName,
        prompt_used: backdrop,
        credits_used: 0,
        status: 'processing',
        result_data: { provider: 'local-cv2-ffmpeg', backdrop },
      })
      .select()
      .single()
    contentId = data?.id
  } catch {
    /* best-effort: falha no banco não deve derrubar o pipeline */
  }

  try {
    const result = await beautifyProduct({ imageUrl, backdrop, outputName: body.outputName })
    if (contentId) {
      const upd = supabase
        .from('generated_content')
        .update({
          status: 'completed',
          result_url: result.resultUrl,
          result_data: { provider: 'local-cv2-ffmpeg', backdrop, bgRemoved: result.bgRemoved },
        })
        .eq('id', contentId)
      Promise.resolve(upd).catch(() => {})
    }
    return NextResponse.json(result)
  } catch (e: any) {
    if (contentId) {
      const upd = supabase
        .from('generated_content')
        .update({
          status: 'failed',
          error_message: e?.message || 'Erro ao gerar a foto do produto',
        })
        .eq('id', contentId)
      Promise.resolve(upd).catch(() => {})
    }
    return NextResponse.json({ error: e?.message || 'Erro ao gerar a foto do produto' }, { status: 500 })
  }
}