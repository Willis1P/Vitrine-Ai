import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { analyzeProduct } from '@/lib/vibevid/product-analyst'
import { PromptForgeFree } from '@/lib/vibevid/forge'
import { generateAidaScripts } from '@/lib/vibevid/scripts'
import { generateTakeVideo, assembleAd } from '@/lib/vibevid/assembler'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
// MuAPI catalog + studio adapter (free fallback keeps Pollinations)
import { submitAndPoll as muapiSubmitAndPoll } from '@/lib/muapi-studio'
import { t2iModels } from '@/lib/studio/models'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function pollinationsImageUrl(prompt: string, seed: number, referenceImage?: string): string {
  let url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1920&nologo=true&model=flux&seed=${seed}&enhance=true`
  if (referenceImage) url += `&image=${encodeURIComponent(referenceImage)}`
  return url
}

function resolveMuapiKey(req: NextRequest): string | null {
  const header = req.headers.get('x-api-key') || req.headers.get('X-API-KEY')
  if (header) return header
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(/muapi_key=([^;]+)/)
  if (m) {
    try { return decodeURIComponent(m[1]) } catch { return m[1] }
  }
  return process.env.MUAPI_API_KEY || null
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user || !supabase) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const productUrl = (body.productUrl || '').trim()
  const modelId = (body.modelId || '').trim()
  const modelUrl = (body.modelUrl || '').trim() // alternativa direta
  if (!productUrl) return NextResponse.json({ error: 'productUrl é obrigatório' }, { status: 400 })
  if (!modelId && !modelUrl) return NextResponse.json({ error: 'Selecione a modelo cadastrada' }, { status: 400 })

  // valida modelo pertence ao usuário — suporta id sintético `${parentId}-${idx}` (gerado em /api/v1/models/generate)
  let finalModelUrl = modelUrl
  let modelName = 'Modelo'
  if (modelId) {
    // extrai UUID parent se modelId for sintético (ex: 550e8400-e29b-41d4-a716-446655440000-1)
    const syntheticMatch = modelId.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d+)$/i)
    const parentId = syntheticMatch ? syntheticMatch[1] : modelId
    let row: any = null
    // tenta id exato primeiro (caso legacy onde modelo foi salvo como row única), depois parentId para sintéticos
    const { data: exact } = await supabase.from('generated_content').select('id,result_url,result_data,product_name').eq('id', modelId).eq('user_id', user.id).maybeSingle()
    if (exact) row = exact
    else if (parentId !== modelId) {
      const { data: parent } = await supabase.from('generated_content').select('id,result_url,result_data,product_name').eq('id', parentId).eq('user_id', user.id).maybeSingle()
      if (parent) row = parent
    } else {
      const { data: legacy } = await supabase.from('generated_content').select('id,result_url,result_data,product_name').eq('id', parentId).eq('user_id', user.id).maybeSingle()
      if (legacy) row = legacy
    }
    if (!row) return NextResponse.json({ error: 'Modelo não encontrada' }, { status: 404 })
    const arr = (row.result_data as any)?.models || []
    const found = arr.find((m: any) => m.id === modelId)
    // se modelId sintético, found corresponde ao slot; se legacy parentId, usa result_url direto
    finalModelUrl = found?.url || row.result_url
    modelName = row.product_name || 'Modelo'
    if (!finalModelUrl) return NextResponse.json({ error: 'Modelo sem imagem' }, { status: 400 })
  }

  // créditos: vídeo realista 4 créditos
  const REQUIRED = 4
  const { data: profile } = await supabase.from('profiles').select('unlimited').eq('id', user.id).maybeSingle()
  const unlimited = profile?.unlimited ?? false
  if (!unlimited) {
    const { data: credits } = await supabase.rpc('get_user_credits', { p_user_id: user.id })
    if (typeof credits !== 'number' || credits < REQUIRED) return NextResponse.json({ error: `Créditos insuficientes. Vídeo realista requer ${REQUIRED} créditos.` }, { status: 402 })
  }

  // Extrai produto real da URL
  const analysis = await analyzeProduct({ productName: '', productDescription: '', imageUrl: productUrl, marketplace: 'shopee' })
  if (!analysis.image) return NextResponse.json({ error: 'Não foi possível extrair imagem do produto da URL. Tente outra URL.' }, { status: 400 })

  const productTitle = analysis.title
  const enriched = analysis.enrichedDescription

  // Forja prompt ultra-realista com modelo selecionada
  const forge = new PromptForgeFree()
  // Busca persona correspondente à modelo? Para fidelidade, usa visual_dna da modelo como override
  // Se não temos persona específica, usa a modelo como referência de imagem + prompt de holding
  const productData = { name: productTitle, description: enriched }
  // Força categoria via análise ou default FASHION, e override de persona via modelo
  const personaOverride = { name: modelName, visual_dna: `same woman as reference image, ultra-realistic, natural skin texture, ${modelName}` }
  const forged = forge.buildProductionPrompt('moda-feminina', personaOverride, productData)
  // Prompt final: produto EXATO + modelo segurando
  const finalPrompt = `${forged.prompt}. Product reference: ${analysis.image}. Model reference: ${finalModelUrl}. Ultra-realistic TikTok Shop ad, 9:16 vertical, sharp focus on model and product, natural TikTok UGC lighting, shallow depth of field. Product fidelity: EXACT same colors, fabric, print as reference.`
  const negative = forged.negative_prompt + ', cartoon, illustration, CGI, deformed hands, extra fingers, wrong product, wrong color'

  const { data: content } = await supabase.from('generated_content').insert({
    user_id: user.id,
    type: 'video',
    product_name: productTitle,
    prompt_used: enriched,
    credits_used: unlimited ? 0 : REQUIRED,
    status: 'processing',
    result_data: { provider: 'realistic-free', productUrl, productImage: analysis.image, modelId: modelId || null, modelUrl: finalModelUrl, prompt: finalPrompt },
  }).select().single()

  try {
    const muapiKey = resolveMuapiKey(request)
    const hasMuapi = !!muapiKey
    const seed = Math.floor(Math.random() * 100000)
    let anchorUrl = pollinationsImageUrl(finalPrompt, seed, analysis.image)
    // Tenta MuAPI para âncora (qualidade superior) se chave disponível - catálogo t2iModels
    if (hasMuapi) {
      try {
        const preferred = t2iModels.find(m=> m.id === 'flux-dev') || t2iModels[0]
        const endpoint = (preferred as any)?.endpoint || preferred.id
        const muapiRes: any = await muapiSubmitAndPoll(endpoint, { prompt: finalPrompt, aspect_ratio: '9:16' }, muapiKey!, undefined, 60)
        const muapiUrl = muapiRes.url || muapiRes.outputs?.[0] || muapiRes.output?.url
        if (muapiUrl) anchorUrl = muapiUrl
      } catch (e) { console.warn('MuAPI anchor fallback to Pollinations', (e as any)?.message) }
    }
    // Valida? Não bloqueia, apenas usa URL diretamente para vídeo (FFmpeg baixa)

    // Gera AIDA scripts para narração (Hook/Valor/CTA mas vídeo único contínuo)
    const scripts = await generateAidaScripts(productTitle, forged.category, modelName, 0)

    // Tenta vídeo MuAPI (seedance-lite-t2v / i2v) se hasMuapi, senão free Ken Burns
    let videoUrl: string | null = null
    let provider: string = hasMuapi ? 'muapi' : 'realistic-free'
    if (hasMuapi) {
      try {
        const videoModel = process.env.MUAPI_VIDEO_MODEL || 'seedance-lite-t2v'
        const isI2V = !!anchorUrl
        const payload: any = { prompt: finalPrompt, aspect_ratio: '9:16', duration: 5 }
        if (isI2V) payload.image_url = anchorUrl
        const muapiVideo: any = await muapiSubmitAndPoll(videoModel, payload, muapiKey!, undefined, 900)
        videoUrl = muapiVideo.url || muapiVideo.outputs?.[0] || muapiVideo.output?.url || null
        if (videoUrl) provider = 'muapi-video'
      } catch (e) { console.warn('MuAPI video fallback to free', (e as any)?.message) }
    }
    if (!videoUrl) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'realistic-'))
      const segment = await generateTakeVideo(finalPrompt + ` - model holding product naturally, authentic UGC, slight movement`, scripts[1] || enriched.slice(0, 60), 0, tmpDir, seed)
      const publicDir = path.join(process.cwd(), 'public', 'generated')
      await fs.mkdir(publicDir, { recursive: true })
      const finalName = `realistic_${Date.now()}.mp4`
      const finalPath = path.join(publicDir, finalName)
      await fs.copyFile(segment, finalPath)
      videoUrl = `/generated/${finalName}`
      provider = 'realistic-free'
    }

    await supabase.from('generated_content').update({
      status: 'completed',
      result_url: videoUrl,
      result_data: {
        provider,
        productUrl,
        productImage: analysis.image,
        modelUrl: finalModelUrl,
        prompt: finalPrompt,
        negative,
        scripts,
        anchorImage: anchorUrl,
      },
    }).eq('id', content!.id)

    if (!unlimited) {
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: REQUIRED,
        type: 'usage',
        description: `Vídeo realista: ${productTitle} + ${modelName}`,
        reference_type: 'video',
        reference_id: content!.id,
      })
    }

    return NextResponse.json({
      id: content!.id,
      videoUrl,
      productImage: analysis.image,
      productTitle,
      modelUsed: modelName,
      modelUrl: finalModelUrl,
      scripts,
      anchorImage: anchorUrl,
    })
  } catch (e: any) {
    await supabase.from('generated_content').update({ status: 'failed', error_message: e?.message || 'Erro' }).eq('id', content!.id)
    return NextResponse.json({ error: e?.message || 'Erro ao gerar vídeo realista' }, { status: 500 })
  }
}
