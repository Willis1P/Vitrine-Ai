import { NextRequest, NextResponse } from 'next/server'
import { scrapeProductUrl, isProductPageUrl } from '@/lib/product-scraper'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }
  const url = (body.url || '').trim()
  if (!url || !isProductPageUrl(url)) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  // SSRF guard: só http/https e bloqueia IPs privados
  try {
    const u = new URL(url)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname.startsWith('10.') || u.hostname.startsWith('192.168.') || u.hostname === '169.254.169.254') {
      return NextResponse.json({ error: 'URL não permitida' }, { status: 400 })
    }
  } catch { return NextResponse.json({ error: 'URL inválida' }, { status: 400 }) }

  const data = await scrapeProductUrl(url)
  // também tenta extrair imagem em alta se houver gallery
  return NextResponse.json({
    url,
    title: data.title || null,
    description: data.description || null,
    image: data.image || null,
    siteName: data.siteName || null,
  })
}
