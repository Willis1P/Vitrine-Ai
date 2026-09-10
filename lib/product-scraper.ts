export interface ScrapedProduct {
  title?: string
  description?: string
  image?: string
  siteName?: string
}

function extractMeta(html: string, property: string): string | undefined {
  // og:property or name="property"
  const regex1 = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i')
  const m1 = html.match(regex1)
  if (m1) return m1[1]
  const regex2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i')
  const m2 = html.match(regex2)
  if (m2) return m2[1]
  const regex3 = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i')
  const m3 = html.match(regex3)
  if (m3) return m3[1]
  return undefined
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1]?.trim()
}

export async function scrapeProductUrl(url: string): Promise<ScrapedProduct> {
  if (!url || !url.startsWith('http')) return {}
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      // 8s timeout
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return {}
    const html = await res.text()
    // limit html to 300k chars
    const sliced = html.slice(0, 300000)
    // tenta JSON-LD (muitos marketplaces)
    let jsonLdTitle: string | undefined
    let jsonLdDesc: string | undefined
    const jsonLdMatch = sliced.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
    if (jsonLdMatch) {
      try {
        const json = JSON.parse(jsonLdMatch[1])
        const obj = Array.isArray(json) ? json[0] : json
        jsonLdTitle = obj?.name || obj?.headline
        jsonLdDesc = obj?.description
      } catch {}
    }
    // tenta __NEXT_DATA__ (Shopee/ML)
    let nextDataTitle: string | undefined
    const nextMatch = sliced.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
    if (nextMatch && !jsonLdTitle) {
      try {
        const next = JSON.parse(nextMatch[1])
        const str = JSON.stringify(next)
        const m = str.match(/"name"\s*:\s*"([^"]{5,100})"/)
        if (m) nextDataTitle = m[1]
      } catch {}
    }
    const title = jsonLdTitle || nextDataTitle || extractMeta(sliced, 'og:title') || extractTitle(sliced)
    const description = jsonLdDesc || extractMeta(sliced, 'og:description') || extractMeta(sliced, 'description')
    const image = extractMeta(sliced, 'og:image') || extractMeta(sliced, 'og:image:secure_url')
    const siteName = extractMeta(sliced, 'og:site_name')
    return {
      title: title?.slice(0, 300),
      description: description?.slice(0, 1000),
      image: image?.startsWith('http') ? image : undefined,
      siteName,
    }
  } catch {
    return {}
  }
}

export function isProductPageUrl(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    // not a supabase storage url and is http(s)
    if (u.hostname.includes('supabase.co') && u.pathname.includes('/storage/')) return false
    // image extensions -> treat as image, not product page
    if (/\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(u.pathname)) return false
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function isImageUrl(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(u.pathname) || u.hostname.includes('supabase.co')
  } catch {
    return false
  }
}
