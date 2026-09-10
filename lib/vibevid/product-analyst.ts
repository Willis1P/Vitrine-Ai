// Agente analista de produto - extrai e enriquece detalhes para fidelidade máxima
// Vibevid-free: URL -> scraping -> enriquecimento LLM -> prompt fiel

import { scrapeProductUrl, isProductPageUrl } from '@/lib/product-scraper'

export interface ProductAnalysis {
  title: string
  description: string
  image: string | null
  marketplace: string
  enrichedDescription: string
  keywords: string[]
}

async function enrichDescription(title: string, rawDesc: string, marketplace: string, category: string): Promise<string> {
  const prompt = `Você é especialista em e-commerce. Dado produto:
Título: ${title}
Descrição curta: ${rawDesc || title}
Marketplace: ${marketplace}
Categoria: ${category}

Gere UMA descrição técnica ultra-detalhada (40-60 palavras) para IA de imagem gerar o MESMO produto com fidelidade. Inclua: cores exatas, material/tecido, corte/modelagem, estampa, detalhes visíveis (mangas, gola, bolsos, zíper), estilo. Seja específico, não genérico. Saída: apenas a descrição, sem título.`

  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: 'openai', seed: Math.floor(Math.random() * 100000) }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return rawDesc || title
    const text = (await res.text()).trim().slice(0, 400)
    return text.length > 20 ? text : (rawDesc || title)
  } catch {
    return rawDesc || title
  }
}

export async function analyzeProduct(input: { productName?: string; productDescription?: string; imageUrl?: string; productCategory?: string; marketplace?: string }): Promise<ProductAnalysis> {
  let title = (input.productName || '').trim()
  let desc = (input.productDescription || '').trim()
  let image: string | null = null
  const marketplace = (input.marketplace || 'shopee').trim()
  const category = (input.productCategory || 'general').trim()

  // Se imageUrl é URL de página, faz scraping
  if (input.imageUrl && isProductPageUrl(input.imageUrl)) {
    const scraped = await scrapeProductUrl(input.imageUrl)
    if (scraped.title && !title) title = scraped.title
    if (scraped.description && !desc) desc = scraped.description
    if (scraped.image) image = scraped.image
    // fallback slug se scraping falhou
    if (!title && !desc) {
      try {
        const u = new URL(input.imageUrl)
        const slug = u.pathname.split('/').filter(Boolean).pop() || ''
        title = decodeURIComponent(slug).replace(/[-_]/g, ' ').slice(0, 80) || 'Produto'
        desc = title
      } catch { title = 'Produto' }
    }
  } else if (input.imageUrl && input.imageUrl.startsWith('http')) {
    // foto enviada (supabase) ou URL de imagem direta
    image = input.imageUrl
  }

  // Se ainda sem título, fallback
  if (!title) title = 'Produto'
  if (!desc) desc = title

  const enriched = await enrichDescription(title, desc, marketplace, category)

  // extrai keywords para prompt
  const keywords = enriched.split(/[,;]/).map(k => k.trim()).filter(Boolean).slice(0, 5)

  return {
    title,
    description: desc,
    image,
    marketplace,
    enrichedDescription: enriched,
    keywords,
  }
}
