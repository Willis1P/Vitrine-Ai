import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { generateCopy, type CopyRequest } from '@/lib/ai-copy'

export const dynamic = 'force-dynamic'

const REQUIRED_CREDITS = 1

interface GenerateRequestBody {
  productName: string
  productFeatures?: string
  targetAudience?: string
  marketplace?: string
  tone?: string
  contentType?: string
  prompts?: string
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))

  if (!user || !supabase) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: GenerateRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const productName = (body.productName || '').trim()

  if (!productName) {
    return NextResponse.json({ error: 'Informe o nome do produto' }, { status: 400 })
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

  const copyRequest: CopyRequest = {
    productName,
    productFeatures: (body.productFeatures || '').trim(),
    targetAudience: (body.targetAudience || '').trim(),
    marketplace: (body.marketplace || '').trim(),
    tone: (body.tone || 'professional') as CopyRequest['tone'],
    contentType: (body.contentType || 'full') as CopyRequest['contentType'],
  }

  const { data: content, error: contentError } = await supabase
    .from('generated_content')
    .insert({
      user_id: user.id,
      type: 'copywriting',
      product_name: productName,
      prompt_used: (body.prompts || body.productFeatures || productName),
      marketplace: copyRequest.marketplace || null,
      credits_used: isUnlimited ? 0 : REQUIRED_CREDITS,
      status: 'processing',
      result_data: {
        content_type: copyRequest.contentType,
        tone: copyRequest.tone,
        target_audience: copyRequest.targetAudience,
        provider: 'free',
      },
    })
    .select()
    .single()

  if (contentError || !content) {
    return NextResponse.json({ error: contentError?.message || 'Erro ao registrar' }, { status: 500 })
  }

  try {
    const { result, source, prompt } = await generateCopy(copyRequest)

    const resultData = {
      content_type: copyRequest.contentType,
      tone: copyRequest.tone,
      target_audience: copyRequest.targetAudience,
      provider: 'free',
      source,
      generated: result,
    }

    const { error: updateError } = await supabase
      .from('generated_content')
      .update({
        status: 'completed',
        prompt_used: prompt || body.prompts || body.productFeatures || productName,
        result_data: resultData,
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
        description: `Copywriting: ${productName}`,
        reference_type: 'copywriting',
        reference_id: content.id,
      })

      if (txError) {
        return NextResponse.json({ error: txError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      id: content.id,
      status: 'completed',
      generated: result,
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

    return NextResponse.json({ error: error?.message || 'Erro na geração da copy' }, { status: 500 })
  }
}