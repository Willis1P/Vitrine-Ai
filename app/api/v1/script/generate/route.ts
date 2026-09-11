import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { generateScript, type GenerateScriptInput, type ScriptAudience } from '@/lib/script-generator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_AUDIENCIAS: ScriptAudience[] = ['geral', 'skincare', 'tech', 'casa', 'beleza']

export async function POST(request: NextRequest) {
  const { user } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const productName = typeof body.productName === 'string' ? body.productName.trim().slice(0, 120) : ''
  if (!productName) return NextResponse.json({ error: 'Informe o nome do produto' }, { status: 400 })

  const sellingPoints: string[] = Array.isArray(body.sellingPoints)
    ? body.sellingPoints.filter((s: any) => typeof s === 'string' && s.trim()).map((s: any) => s.trim()).slice(0, 8)
    : []

  const reviews: string[] = Array.isArray(body.reviews)
    ? body.reviews.filter((r: any) => typeof r === 'string' && r.trim()).map((r: any) => r.trim()).slice(0, 5)
    : []

  let price: number | null = null
  if (typeof body.price === 'number' && isFinite(body.price) && body.price > 0) {
    price = body.price
  } else if (typeof body.price === 'string' && body.price.trim() !== '') {
    const parsed = parseFloat(body.price.replace(',', '.'))
    if (isFinite(parsed) && parsed > 0) price = parsed
  }

  const currency = typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim().slice(0, 4) : 'R$'
  const audiencia: ScriptAudience = VALID_AUDIENCIAS.includes(body.audiencia) ? body.audiencia : 'geral'
  const tomHook = typeof body.tomHook === 'number' && Number.isInteger(body.tomHook) ? body.tomHook : undefined

  const input: GenerateScriptInput = {
    productName,
    sellingPoints,
    reviews,
    price,
    currency,
    audiencia,
    tomHook,
  }

  try {
    const result = await generateScript(input)
    return NextResponse.json({
      hook: result.hook,
      script: result.script,
      cta: result.cta,
      full: result.full,
      provider: result.provider,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao gerar roteiro' }, { status: 500 })
  }
}