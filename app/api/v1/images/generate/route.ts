import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { generateProductImages, type ProductImageParams } from '@/lib/image-generator'
import { scrapeProductUrl, isProductPageUrl } from '@/lib/product-scraper'

export const dynamic = 'force-dynamic'

const REQUIRED_CREDITS = 1

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))

  if (!user || !supabase) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  let productName = (body.productName || '').trim()
  let description = (body.productDescription || '').trim()
  let imageUrl = (body.imageUrl || '').trim()

  // Se enviou URL de produto (ex: shopee/ml) sem nome/descrição, tenta scraping
  if (isProductPageUrl(imageUrl)) {
    if (!productName && !description) {
      const scraped = await scrapeProductUrl(imageUrl)
      if (scraped.title) productName = scraped.title
      if (scraped.description) description = scraped.description
    }
    // fallback quando scraping falha (ex: Shopee JS-render): usa slug da URL ou marketplace
    if (!productName && !description) {
      try {
        const urlObj = new URL(imageUrl)
        const slug = urlObj.pathname.split('/').filter(Boolean).pop() || ''
        const pretty = decodeURIComponent(slug).replace(/[-_]/g, ' ').slice(0, 80)
        const marketplaceHint = (body.marketplace || '').trim() || urlObj.hostname.replace('www.', '')
        productName = pretty || `Produto ${marketplaceHint}`
        description = `Produto do marketplace ${marketplaceHint}` + (pretty ? `: ${pretty}` : '')
      } catch {
        productName = 'Produto'
        description = 'Produto para geração de imagem'
      }
    }
  }

  // Fallback para foto enviada sem nome/descrição
  if (!productName && !description && imageUrl) {
    // imageUrl é foto do Storage (supabase) -> usar nome genérico com estilo
    productName = 'Produto enviado'
    description = `Produto fotografia ${body.style || 'profissional'} para ${body.marketplace || 'marketplace'}`
  }

  if (!productName && !description) {
    return NextResponse.json({ error: 'Informe o nome/descrição ou URL do produto / envie uma foto' }, { status: 400 })
  }

  const params: ProductImageParams = {
    productName: productName || 'Produto',
    productDescription: description || productName,
    productCategory: (body.productCategory || '').trim(),
    marketplace: (body.marketplace || '').trim(),
    style: (body.style || 'professional').trim(),
    imageUrl,
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('unlimited')
    .eq('id', user.id)
    .maybeSingle()

  const isUnlimited = profile?.unlimited ?? false

  if (!isUnlimited) {
    const { data: credits } = await supabase.rpc('get_user_credits', { p_user_id: user.id })

    if (typeof credits !== 'number' || credits < REQUIRED_CREDITS) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Esta geração requer ${REQUIRED_CREDITS} crédito.` },
        { status: 402 }
      )
    }
  }

  const { data: content, error: contentError } = await supabase
    .from('generated_content')
    .insert({
      user_id: user.id,
      type: 'image',
      product_name: productName || null,
      product_category: params.productCategory || null,
      marketplace: params.marketplace || null,
      prompt_used: description || productName,
      credits_used: isUnlimited ? 0 : REQUIRED_CREDITS,
      status: 'processing',
      result_data: {
        style: params.style,
        provider: 'free',
        product_url: params.imageUrl || null,
      },
    })
    .select()
    .single()

  if (contentError || !content) {
    return NextResponse.json({ error: contentError?.message || 'Erro ao registrar' }, { status: 500 })
  }

  try {
    const generated = await generateProductImages(params, 4)

    const now = new Date().toISOString()
    const images = generated.map((img, i) => ({
      id: `${content.id}-${i}`,
      url: img.url,
      prompt: description || productName,
      style: params.style,
      created_at: now,
    }))

    const resultUrl = images[0].url

    const { error: updateError } = await supabase
      .from('generated_content')
      .update({
        status: 'completed',
        result_url: resultUrl,
        result_data: {
          style: params.style,
          provider: 'free',
          product_url: params.imageUrl || null,
          images,
        },
      })
      .eq('id', content.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!isUnlimited) {
      const { error: txError } = await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: REQUIRED_CREDITS,
        type: 'usage',
        description: `Geração de imagem: ${productName || 'Produto'}`,
        reference_type: 'image',
        reference_id: content.id,
      })

      if (txError) {
        return NextResponse.json({ error: txError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      id: content.id,
      status: 'completed',
      result_url: resultUrl,
      images,
      credits_used: isUnlimited ? 0 : REQUIRED_CREDITS,
      provider: 'free',
    })
  } catch (error: any) {
    await supabase
      .from('generated_content')
      .update({
        status: 'failed',
        error_message: error?.message || 'Erro na geração',
      })
      .eq('id', content.id)

    return NextResponse.json({ error: error?.message || 'Erro ao gerar imagens' }, { status: 500 })
  }
}