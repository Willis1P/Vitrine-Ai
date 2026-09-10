import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { generateVirtualModels, type VirtualModelParams } from '@/lib/image-generator'

export const dynamic = 'force-dynamic'

const REQUIRED_CREDITS = 3

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

  const productName = (body.productName || '').trim()
  const description = (body.productDescription || '').trim()

  if (!productName && !description) {
    return NextResponse.json({ error: 'Informe o nome ou descrição do produto' }, { status: 400 })
  }

  const params: VirtualModelParams = {
    productName,
    productDescription: description,
    productCategory: (body.productCategory || '').trim(),
    marketplace: (body.marketplace || '').trim(),
    modelType: (body.modelType || 'woman').trim(),
    skinTone: (body.skinTone || 'medium').trim(),
    ageRange: (body.ageRange || '26-35').trim(),
    background: (body.background || 'studio').trim(),
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
        { error: `Créditos insuficientes. Esta geração requer ${REQUIRED_CREDITS} créditos.` },
        { status: 402 }
      )
    }
  }

  const { data: content, error: contentError } = await supabase
    .from('generated_content')
    .insert({
      user_id: user.id,
      type: 'model',
      product_name: productName || null,
      prompt_used: description || productName,
      credits_used: isUnlimited ? 0 : REQUIRED_CREDITS,
      status: 'processing',
      result_data: {
        model_type: params.modelType,
        skin_tone: params.skinTone,
        age_range: params.ageRange,
        background: params.background,
        provider: 'free',
      },
    })
    .select()
    .single()

  if (contentError || !content) {
    return NextResponse.json({ error: contentError?.message || 'Erro ao registrar' }, { status: 500 })
  }

  try {
    const generated = await generateVirtualModels(params, 3)

    const now = new Date().toISOString()
    const models = generated.map((img, i) => ({
      id: `${content.id}-${i}`,
      url: img.url,
      modelType: params.modelType,
      created_at: now,
    }))

    const resultUrl = models[0].url

    const { error: updateError } = await supabase
      .from('generated_content')
      .update({
        status: 'completed',
        result_url: resultUrl,
        result_data: {
          model_type: params.modelType,
          skin_tone: params.skinTone,
          age_range: params.ageRange,
          background: params.background,
          provider: 'free',
          models,
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
        description: `Modelo virtual: ${productName || 'Produto'}`,
        reference_type: 'model',
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
      models,
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

    return NextResponse.json({ error: error?.message || 'Erro ao gerar modelos' }, { status: 500 })
  }
}