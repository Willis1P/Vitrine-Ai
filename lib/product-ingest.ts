export type IngestResult = IngestSuccess | IngestFailure

interface IngestSuccess {
  ok: true
  url: string
  provider: string
  name: string
  images: string[]
  description: string
  price: number | null
  currency: string | null
  rating: number | null
  ratingCount: number | null
  reviews: { author: string; ratingValue: number | null; description: string }[]
}

interface IngestFailure {
  ok: false
  reason: 'blocked' | 'invalid-url' | 'fetch-error' | 'no-product'
  message: string
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const BLOCKED_PATTERNS = [
  /captcha/i,
  /robot.*verify/i,
  /access.denied/i,
  /please.confirm.you.are.human/i,
  /challenge-platform/i,
  /cf-browser-verification/i,
  /datadome/i,
  /incapsula/i,
  /akamai.*bot/i,
  /login.*page/i,
  /sign.in/i,
]

function isValidUrl(raw: string): boolean {
  if (typeof raw !== 'string') return false
  const trimmed = raw.trim()
  if (!trimmed) return false
  try {
    const u = new URL(trimmed)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

function dedup(arr: string[]): string[] {
  return Array.from(new Set(arr))
}

function isTinyImage(url: string): boolean {
  return /\b(1x1|pixel|spacer|blank|transparent|placeholder|spinner|loading)\b/i.test(url)
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^\d.,]/g, '').replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickReviews(raw: unknown): IngestSuccess['reviews'] {
  if (!Array.isArray(raw)) return []
  const out: IngestSuccess['reviews'] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const r = item as Record<string, unknown>
    const reviewBody =
      typeof r['reviewBody'] === 'string'
        ? r['reviewBody']
        : typeof r['description'] === 'string'
          ? r['description']
          : ''
    const authorObj = r['author']
    const author =
      typeof authorObj === 'string'
        ? authorObj
        : typeof authorObj === 'object' && authorObj !== null
          ? String((authorObj as Record<string, unknown>)['name'] || '')
          : ''
    const rv = toNum(r['reviewRating'] && typeof r['reviewRating'] === 'object' ? (r['reviewRating'] as Record<string, unknown>)['ratingValue'] : r['ratingValue'])
    if (!author && !reviewBody) continue
    out.push({ author: author.slice(0, 200), ratingValue: rv, description: reviewBody.slice(0, 800) })
    if (out.length >= 5) break
  }
  return out
}

function pickImagesFromJsonLd(node: Record<string, unknown>, baseUrl: string): string[] {
  const imgs: string[] = []
  const raw = node['image']
  if (typeof raw === 'string') {
    const u = resolveUrl(raw, baseUrl)
    if (u) imgs.push(u)
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        const u = resolveUrl(item, baseUrl)
        if (u) imgs.push(u)
      } else if (typeof item === 'object' && item !== null) {
        const u = resolveUrl(String((item as Record<string, unknown>)['url'] || ''), baseUrl)
        if (u) imgs.push(u)
      }
    }
  }
  const raw2 = node['images']
  if (Array.isArray(raw2)) {
    for (const item of raw2) {
      if (typeof item === 'string') {
        const u = resolveUrl(item, baseUrl)
        if (u) imgs.push(u)
      }
    }
  }
  return imgs
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => (n > 0 && n < 65536 ? String.fromCharCode(Number(n)) : ''))
}

function extractScriptBlocks(html: string, type: string): string[] {
  const blocks: string[] = []
  const escaped = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<script[^>]*type=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) blocks.push(m[1].trim())
  return blocks
}

function extractTagAttributes(html: string): Array<Record<string, string>> {
  const out: Array<Record<string, string>> = []
  const metaRe = /<meta[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = metaRe.exec(html))) {
    const attrs: Record<string, string> = {}
    const attrRe = /([a-zA-Z:_-]+)="([^"]*)"|([a-zA-Z:_-]+)='([^']*)'/g
    let am: RegExpExecArray | null
    while ((am = attrRe.exec(m[0]))) {
      if (am[1] !== undefined) attrs[am[1].toLowerCase()] = decodeEntities(am[2])
      else attrs[am[3].toLowerCase()] = decodeEntities(am[4])
    }
    out.push(attrs)
  }
  return out
}

function extractJsonLd(html: string, baseUrl: string): Partial<IngestSuccess> | null {
  const result: Partial<IngestSuccess> = { images: [], reviews: [] }
  let found = false

  for (const text of extractScriptBlocks(html, 'application/ld+json')) {
    if (found) break
    let parsed: unknown
    try {
      parsed = JSON.parse(text.trim())
    } catch {
      continue
    }

    const nodes: Record<string, unknown>[] = []
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === 'object' && item !== null) nodes.push(item as Record<string, unknown>)
      }
    } else if (typeof parsed === 'object' && parsed !== null) {
      nodes.push(parsed as Record<string, unknown>)
    }

    for (const node of nodes) {
      const type = String(node['@type'] || '')
      const isProduct = /product/i.test(type)
      const isItemPage = /itempage/i.test(type)
      const offers = node['offers'] as Record<string, unknown> | undefined

      if (isProduct || (isItemPage && offers && typeof offers['price'] !== 'undefined')) {
        const name = typeof node['name'] === 'string' ? node['name'] : typeof node['headline'] === 'string' ? node['headline'] : ''
        if (!name) continue

        result.name = name.slice(0, 300)
        result.description = (typeof node['description'] === 'string' ? node['description'] : '').slice(0, 1000)
        result.images = pickImagesFromJsonLd(node, baseUrl)

        if (offers && typeof offers === 'object') {
          result.price = toNum(offers['price'])
          result.currency = typeof offers['priceCurrency'] === 'string' ? offers['priceCurrency'] : null
          if (offers['availability']) {
            const avail = String(offers['availability'])
            if (/outofstock|soldout/i.test(avail)) result.price = null
          }
        }

        const agg = node['aggregateRating'] as Record<string, unknown> | undefined
        if (agg && typeof agg === 'object') {
          result.rating = toNum(agg['ratingValue'])
          result.ratingCount = toNum(agg['ratingCount'] || agg['reviewCount'])
        }

        result.reviews = pickReviews(node['review'])
        found = true
        break
      }
    }
    if (found) break
  }

  return found ? result : null
}

function extractOpenGraph(html: string): Partial<IngestSuccess> | null {
  const metas = extractTagAttributes(html)
  const byProp = (prop: string) => metas.find((a) => a['property']?.toLowerCase() === prop)?.['content'] || ''
  const ogTitle = byProp('og:title')
  if (!ogTitle) return null
  return {
    name: ogTitle.slice(0, 300),
    images: [byProp('og:image'), byProp('og:image:secure_url')].filter((v) => !!v && v.startsWith('http')),
    description: (byProp('og:description') || '').slice(0, 1000),
  }
}

function extractFallback(html: string, baseUrl: string): Partial<IngestSuccess> | null {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? decodeEntities(titleMatch[1].replace(/\s+/g, ' ')).trim() : ''
  if (!title) return null

  const images: string[] = []
  const imgRe = /<img[^>]*\ssrc=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = imgRe.exec(html)) && images.length < 5) {
    const src = m[1]
    if (src.startsWith('data:')) continue
    const abs = resolveUrl(src, baseUrl)
    if (abs) images.push(abs)
  }

  const metas = extractTagAttributes(html)
  const desc = metas.find((a) => a['name']?.toLowerCase() === 'description')?.['content'] || ''

  return {
    name: title.slice(0, 300),
    images,
    description: desc.slice(0, 1000),
  }
}

function mergeResult(
  url: string,
  jsonLd: Partial<IngestSuccess> | null,
  og: Partial<IngestSuccess> | null,
  fallback: Partial<IngestSuccess> | null
): IngestSuccess | IngestFailure {
  const provider = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return 'unknown'
    }
  })()

  const source = jsonLd || og || fallback
  const name = source?.name?.trim() || ''

  if (!name) {
    return { ok: false, reason: 'no-product', message: 'Não foi possível identificar o produto nesta página.' }
  }

  const allImages = [...(jsonLd?.images || []), ...(og?.images || []), ...(fallback?.images || [])]
    .filter((img) => {
      if (!img.startsWith('http')) return false
      if (img.startsWith('data:')) return false
      if (isTinyImage(img)) return false
      return true
    })

  return {
    ok: true,
    url,
    provider,
    name,
    images: dedup(allImages).slice(0, 10),
    description: (jsonLd?.description || og?.description || fallback?.description || '').slice(0, 1000),
    price: jsonLd?.price ?? null,
    currency: jsonLd?.currency ?? null,
    rating: jsonLd?.rating ?? null,
    ratingCount: jsonLd?.ratingCount ?? null,
    reviews: jsonLd?.reviews ?? [],
  }
}

export async function ingestProduct(url: string): Promise<IngestResult> {
  if (!isValidUrl(url)) {
    return { ok: false, reason: 'invalid-url', message: 'URL inválida. Informe uma URL http ou https válida.' }
  }

  const trimmed = url.trim()

  let html: string
  try {
    const res = await fetch(trimmed, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      if (res.status === 403 || res.status === 429 || res.status === 503) {
        return { ok: false, reason: 'blocked', message: 'O site bloqueou o acesso. Tente colar as informações manualmente.' }
      }
      return { ok: false, reason: 'fetch-error', message: `Erro ao acessar a página (HTTP ${res.status}).` }
    }

    html = (await res.text()).slice(0, 3_000_000)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/abort|timeout/i.test(msg)) {
      return { ok: false, reason: 'fetch-error', message: 'A página demorou demais para responder (timeout).' }
    }
    return { ok: false, reason: 'fetch-error', message: 'Não foi possível acessar a URL informada.' }
  }

  if (BLOCKED_PATTERNS.some((p) => p.test(html.slice(0, 50000)))) {
    return { ok: false, reason: 'blocked', message: 'O site bloqueou o acesso. Tente colar as informações manualmente.' }
  }

  const jsonLd = extractJsonLd(html, trimmed)
  const og = extractOpenGraph(html)
  const fallback = extractFallback(html, trimmed)

  const result = mergeResult(trimmed, jsonLd, og, fallback)

  if (result.ok && result.images.length === 0 && !result.price) {
    const isLikelyProductPage = /\/(p|product|item|produto|detail|produto)\b/i.test(trimmed)
    if (!isLikelyProductPage) {
      return { ok: false, reason: 'no-product', message: 'Esta página parece não ser de um produto. Verifique o link.' }
    }
  }

  return result
}
