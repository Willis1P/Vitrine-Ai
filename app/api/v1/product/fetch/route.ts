import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import { ingestProduct, type IngestResult } from '@/lib/product-ingest'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { user } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!url) {
    return NextResponse.json({ error: 'Informe a URL do produto' }, { status: 400 })
  }

  const result: IngestResult = await ingestProduct(url)

  if (!result.ok) {
    return NextResponse.json(result)
  }

  return NextResponse.json(result)
}
