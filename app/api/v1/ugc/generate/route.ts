import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { DEFAULT_VOICE } from '@/lib/tts'
import { generateUgcVideo, UGC_RATIOS, type UgcRatioId } from '@/lib/ugc-generator'
import type { LookId } from '@/lib/ugc-shared'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const REQUIRED_CREDITS = 4

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user || !supabase) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const productName = (body.productName || '').trim()
  const images: string[] = Array.isArray(body.images) ? body.images.filter((i: any) => typeof i === 'string' && i.startsWith('http')).slice(0, 10) : []
  const sellingPoints: string[] = Array.isArray(body.sellingPoints) ? body.sellingPoints.filter((s: any) => typeof s === 'string' && s.trim()).map((s: any) => s.trim()).slice(0, 3) : []

  if (!productName) return NextResponse.json({ error: 'Informe o nome do produto' }, { status: 400 })
  if (images.length === 0) return NextResponse.json({ error: 'Envie pelo menos 1 imagem do produto' }, { status: 400 })

  const ratio = UGC_RATIOS[body.ratio as UgcRatioId] ? (body.ratio as UgcRatioId) : '9:16'
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 900) : ''
  const look: LookId = ['brazilian', 'brazilian-morena', 'american', 'european'].includes(body.look) ? body.look : 'brazilian'
  const voice = typeof body.voice === 'string' && body.voice ? body.voice : DEFAULT_VOICE

  const { data: profile } = await supabase.from('profiles').select('unlimited').eq('id', user.id).maybeSingle()
  const unlimited = profile?.unlimited ?? false

  if (!unlimited) {
    const { data: credits } = await supabase.rpc('get_user_credits', { p_user_id: user.id })
    if (typeof credits !== 'number' || credits < REQUIRED_CREDITS) {
      return NextResponse.json({ error: `Créditos insuficientes. Vídeo UGC requer ${REQUIRED_CREDITS} créditos.` }, { status: 402 })
    }
  }

  const { data: content } = await supabase.from('generated_content').insert({
    user_id: user.id,
    type: 'video',
    product_name: productName,
    prompt_used: prompt || productName,
    credits_used: unlimited ? 0 : REQUIRED_CREDITS,
    status: 'processing',
    result_data: { provider: 'ugc-free', ratio, imagesCount: images.length, sellingPoints, look, voice },
  }).select().single()

  try {
    const result = await generateUgcVideo({ productName, images, sellingPoints, ratio, prompt, look, voice })

    await supabase.from('generated_content').update({
      status: 'completed',
      result_url: result.urlPath,
      result_data: {
        provider: 'ugc-free',
        ratio,
        imagesCount: images.length,
        sellingPoints: result.sellingPoints,
        scripts: result.scripts,
        prompt: result.prompt,
        look,
        voice: result.voice,
        narrationApplied: result.narrationApplied,
        sizeBytes: result.sizeBytes,
      },
    }).eq('id', content!.id)

    if (!unlimited) {
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: REQUIRED_CREDITS,
        type: 'usage',
        description: `Vídeo UGC: ${productName}`,
        reference_type: 'video',
        reference_id: content!.id,
      })
    }

    return NextResponse.json({
      id: content!.id,
      status: 'completed',
      videoUrl: result.urlPath,
      scripts: result.scripts,
      sellingPoints: result.sellingPoints,
      prompt: result.prompt,
      narrationApplied: result.narrationApplied,
      voice: result.voice,
      durationSeconds: result.durationSeconds,
      credits_used: unlimited ? 0 : REQUIRED_CREDITS,
    })
  } catch (e: any) {
    await supabase.from('generated_content').update({ status: 'failed', error_message: e?.message || 'Erro ao gerar vídeo UGC' }).eq('id', content!.id)
    return NextResponse.json({ error: e?.message || 'Erro ao gerar vídeo UGC' }, { status: 500 })
  }
}