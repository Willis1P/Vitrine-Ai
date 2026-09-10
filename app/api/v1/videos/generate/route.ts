import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { generateFreeProductVideo } from '@/lib/video-generator'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

interface GenerateRequestBody {
  productName: string
  productDescription: string
  videoType: string
  duration: string
  style: string
}

const DURATION_MAP: Record<string, number> = {
  '15s': 15,
  '30s': 30,
  '60s': 60,
}

const CREDIT_MAP: Record<string, number> = {
  '15s': 5,
  '30s': 8,
  '60s': 12,
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
  const description = (body.productDescription || '').trim()

  if (!productName && !description) {
    return NextResponse.json({ error: 'Informe o nome ou descrição do produto' }, { status: 400 })
  }

  const videoType = body.videoType || 'ugc'
  const durationKey = body.duration && DURATION_MAP[body.duration] ? body.duration : '15s'
  const style = body.style || 'tiktok'

  const requiredCredits = CREDIT_MAP[durationKey]
  const durationSeconds = DURATION_MAP[durationKey]

  const { data: profile } = await supabase
    .from('profiles')
    .select('unlimited')
    .eq('id', user.id)
    .maybeSingle()

  const isUnlimited = profile?.unlimited ?? false

  if (!isUnlimited) {
    const { data: credits } = await supabase.rpc('get_user_credits', { p_user_id: user.id })

    if (typeof credits !== 'number' || credits < requiredCredits) {
      return NextResponse.json(
        { error: `Créditos insuficientes. Este vídeo requer ${requiredCredits} créditos.` },
        { status: 402 }
      )
    }
  }

  const { data: content, error: contentError } = await supabase
    .from('generated_content')
    .insert({
      user_id: user.id,
      type: 'video',
      product_name: productName || null,
      prompt_used: description || productName,
      credits_used: isUnlimited ? 0 : requiredCredits,
      status: 'processing',
      result_data: {
        video_type: videoType,
        duration: durationKey,
        style,
        provider: 'free',
      },
    })
    .select()
    .single()

  if (contentError || !content) {
    return NextResponse.json({ error: contentError?.message || 'Erro ao registrar' }, { status: 500 })
  }

  try {
    const outputDir = path.join(process.cwd(), '.cache', 'video-gen')
    fs.mkdirSync(outputDir, { recursive: true })

    const publicDir = path.join(process.cwd(), 'public', 'generated')
    fs.mkdirSync(publicDir, { recursive: true })

    const result = await generateFreeProductVideo(
      {
        productName: productName || 'Produto',
        description,
        videoType,
        duration: durationSeconds,
        style,
      },
      outputDir,
      '/generated'
    )

    const destPath = path.join(publicDir, path.basename(result.filePath))
    fs.copyFileSync(result.filePath, destPath)
    fs.rmSync(result.filePath, { force: true })

    const resultUrl = `${result.urlPath}`

    const { error: updateError } = await supabase
      .from('generated_content')
      .update({
        status: 'completed',
        result_url: resultUrl,
        result_data: {
          video_type: videoType,
          duration: durationKey,
          style,
          provider: 'free',
          sizeBytes: result.sizeBytes,
        },
      })
      .eq('id', content.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!isUnlimited) {
      const { error: txError } = await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: requiredCredits,
        type: 'usage',
        description: `Vídeo: ${productName || 'Produto'}`,
        reference_type: 'video',
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
      credits_used: isUnlimited ? 0 : requiredCredits,
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

    return NextResponse.json({ error: error?.message || 'Erro na geração do vídeo' }, { status: 500 })
  }
}