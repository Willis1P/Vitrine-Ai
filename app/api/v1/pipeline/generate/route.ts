import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { runPipelineFree } from '@/lib/vibevid/pipeline'
import { scrapeProductUrl, isProductPageUrl } from '@/lib/product-scraper'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user || !supabase) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  let productName = (body.productName || '').trim()
  let description = (body.productDescription || '').trim()
  let imageUrl = (body.imageUrl || '').trim()
  const productCategory = (body.productCategory || 'general').trim()
  const marketplace = (body.marketplace || '').trim()
  const style = (body.style || 'professional').trim()
  const mode = body.mode === 'auto' ? 'auto' : 'interactive'
  const numFrames = Math.min(Math.max(parseInt(body.numFrames) || 3, 1), 6)

  // scraping se só URL
  if (isProductPageUrl(imageUrl) && !productName && !description) {
    const scraped = await scrapeProductUrl(imageUrl)
    if (scraped.title) productName = scraped.title
    if (scraped.description) description = scraped.description
    if (!productName && !description) {
      try {
        const u = new URL(imageUrl)
        const slug = u.pathname.split('/').filter(Boolean).pop() || ''
        productName = decodeURIComponent(slug).replace(/[-_]/g, ' ').slice(0, 80) || 'Produto'
        description = `Produto ${marketplace || u.hostname}`
      } catch { productName = 'Produto' }
    }
  }
  if (!productName && !description && imageUrl && !isProductPageUrl(imageUrl)) {
    productName = 'Produto enviado'
    description = productName
  }
  if (!productName && !description) return NextResponse.json({ error: 'Informe nome/descrição ou URL/foto' }, { status: 400 })

  // créditos: pipeline free = 2 créditos só frames+scripts (rápido), vídeo extra 2 créditos
  const REQUIRED = 2
  const { data: profile } = await supabase.from('profiles').select('unlimited').eq('id', user.id).maybeSingle()
  const unlimited = profile?.unlimited ?? false
  if (!unlimited) {
    const { data: credits } = await supabase.rpc('get_user_credits', { p_user_id: user.id })
    if (typeof credits !== 'number' || credits < REQUIRED) {
      return NextResponse.json({ error: `Créditos insuficientes. Pipeline requer ${REQUIRED} créditos.` }, { status: 402 })
    }
  }

  const { data: content } = await supabase.from('generated_content').insert({
    user_id: user.id,
    type: 'video',
    product_name: productName,
    product_category: productCategory || null,
    marketplace: marketplace || null,
    prompt_used: description || productName,
    credits_used: unlimited ? 0 : REQUIRED,
    status: 'processing',
    result_data: { mode, numFrames, style, imageUrl, provider: 'vibevid-free' },
  }).select().single()

  try {
    const effectiveNumFrames = mode === 'auto' ? 3 : numFrames
    const result = await runPipelineFree({
      productName,
      productDescription: description,
      productCategory,
      marketplace,
      style,
      imageUrl,
      mode,
      numFrames: effectiveNumFrames,
      withVideo: false,
    } as any)

    const finalUrl = result.finalAds[0]?.url || result.frames[0]?.imageUrl || null

    await supabase.from('generated_content').update({
      status: 'completed',
      result_url: finalUrl,
      result_data: {
        mode, numFrames, style, imageUrl, provider: 'vibevid-free',
        frames: result.frames,
        approvedFrames: (result as any).approvedFrames.map((f:any) => f.frame_id),
        scripts: (result as any).scripts,
        finalAds: (result as any).finalAds,
        videos: (result as any).videos.map((v:any) => ({ frame_id: v.frame_id, take: v.take, url: v.url })),
        analysis: (result as any).analysis,
      },
    }).eq('id', content!.id)

    if (!unlimited) {
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: REQUIRED,
        type: 'usage',
        description: `Pipeline Vibevid Free: ${productName}`,
        reference_type: 'video',
        reference_id: content!.id,
      })
    }

    return NextResponse.json({
      id: content!.id,
      status: 'completed',
      frames: result.frames,
      approvedFrames: result.approvedFrames,
      scripts: result.scripts,
      finalAds: result.finalAds,
      credits_used: unlimited ? 0 : REQUIRED,
    })
  } catch (e: any) {
    await supabase.from('generated_content').update({ status: 'failed', error_message: e?.message || 'Erro pipeline' }).eq('id', content!.id)
    return NextResponse.json({ error: e?.message || 'Erro no pipeline' }, { status: 500 })
  }
}
