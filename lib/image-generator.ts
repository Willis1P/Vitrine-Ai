export interface ProductImageParams {
  productName: string
  productDescription?: string
  productCategory?: string
  marketplace?: string
  style?: string
  imageUrl?: string
}

export interface VirtualModelParams {
  productName: string
  productDescription?: string
  productCategory?: string
  marketplace?: string
  modelType?: string
  skinTone?: string
  ageRange?: string
  background?: string
}

export interface GeneratedImageUrl {
  url: string
}

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt'
const TIMEOUT_MS = 20000

const STYLE_SCENES: Record<string, string> = {
  professional: 'professional studio product photography, softbox lighting, sharp focus on product details',
  'white-bg': 'product photography on a clean pure white background, perfect for marketplaces',
  lifestyle: 'lifestyle photography showing the product being used in everyday life, natural light',
  banner: 'promotional banner style product photography with bold offer highlights',
  carousel: 'product carousel photography, multiple angles of the same product',
  instagram: 'instagram square post product photography, eye-catching commercial composition',
  story: 'vertical instagram story product photography, tall format, vibrant',
  tiktok: 'vertical tiktok shop product photography, tall format, trendy',
}

const IMAGE_VARIATIONS = [
  'hero shot, product centered, premium e-commerce quality, clean composition',
  'three-quarter angle shot, soft shadows, subtle gradient background, high-end catalog photo',
  'close-up detail shot, shallow depth of field, editorial quality, warm tones',
  'lifestyle scene, product in real use context, natural framing, commercial photography',
]

const MODEL_TYPE_DESC: Record<string, string> = {
  woman: 'an adult woman',
  man: 'an adult man',
  young: 'a young adult',
  executive: 'an executive professional',
  influencer: 'a social media influencer',
  fitness: 'a fit athletic adult',
}

const SKIN_TONE_DESC: Record<string, string> = {
  light: 'light skin tone',
  medium: 'medium skin tone',
  dark: 'dark skin tone',
}

const AGE_RANGE_DESC: Record<string, string> = {
  '18-25': 'around 20 years old',
  '26-35': 'around 30 years old',
  '36-45': 'around 40 years old',
  '46-55': 'around 50 years old',
  '55+': 'around 60 years old',
}

const BACKGROUND_DESC: Record<string, string> = {
  studio: 'clean professional photo studio background',
  outdoor: 'bright outdoor natural environment',
  urban: 'modern urban city background',
  home: 'cozy home interior environment',
  beach: 'sunny beach background',
  minimal: 'minimalist neutral seamless background',
}

const MODEL_VARIATIONS = [
  'full body shot, looking directly at the camera, confident natural pose',
  'three-quarter body shot, gently holding or wearing the product, warm genuine smile',
  'half body shot, presenting the product to the camera, professional modeling pose',
]

function pollinationsUrl(prompt: string, seed: number): string {
  const cacheBust = Date.now()
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}&nocache=${cacheBust}`
}

async function fetchImage(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Falha ao gerar imagem (status ${response.status})`)
    }
    await response.body?.cancel()
  } finally {
    clearTimeout(timer)
  }
  return url
}

async function generateWithFallback(url: string, fallbackUrl: string): Promise<string> {
  try {
    return await fetchImage(url)
  } catch {
    return fetchImage(fallbackUrl)
  }
}

function buildProductImagePrompt(params: ProductImageParams, index: number): string {
  const name = params.productName || 'product'
  const desc = params.productDescription || name
  const category = params.productCategory ? `category ${params.productCategory}` : ''
  const marketplace = params.marketplace ? `for ${params.marketplace} marketplace` : ''
  const styleScene = STYLE_SCENES[params.style || 'professional'] || STYLE_SCENES.professional
  const variation = IMAGE_VARIATIONS[index % IMAGE_VARIATIONS.length]

  return `${styleScene}, ${variation}. Product: ${name}${category ? `, ${category}` : ''} ${marketplace}. ${desc}. Photorealistic, high resolution, sharp details, vibrant natural colors, e-commerce photography`
}

function buildModelPrompt(params: VirtualModelParams, index: number): string {
  const name = params.productName || 'product'
  const desc = params.productDescription || name
  const person = MODEL_TYPE_DESC[params.modelType || 'woman'] || 'an adult woman'
  const skin = SKIN_TONE_DESC[params.skinTone || 'medium'] || 'medium skin tone'
  const age = AGE_RANGE_DESC[params.ageRange || '26-35'] || 'young adult'
  const bg = BACKGROUND_DESC[params.background || 'studio'] || 'clean studio background'
  const variation = MODEL_VARIATIONS[index % MODEL_VARIATIONS.length]

  return `Photorealistic virtual try-on model photo: ${person} with ${skin}, ${age}, in a ${bg}, ${variation}, wearing or holding the product: ${name}. ${desc}. Professional e-commerce fashion photography, studio lighting, sharp focus on model and product, realistic skin texture, high quality`
}

export async function generateProductImages(
  params: ProductImageParams,
  count: number = 4
): Promise<GeneratedImageUrl[]> {
  const baseSeed = Math.floor(Date.now() % 100000)

  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const prompt = buildProductImagePrompt(params, i)
      const url = pollinationsUrl(prompt, baseSeed + i)
      const fallbackUrl = pollinationsUrl(prompt, baseSeed + 1000 + i)
      const finalUrl = await generateWithFallback(url, fallbackUrl)
      return { url: finalUrl }
    })
  )
}

export async function generateVirtualModels(params: VirtualModelParams, count: number = 3): Promise<GeneratedImageUrl[]> {
  const baseSeed = Math.floor(Date.now() % 100000)

  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const prompt = buildModelPrompt(params, i)
      const url = pollinationsUrl(prompt, baseSeed + i)
      const fallbackUrl = pollinationsUrl(prompt, baseSeed + 1000 + i)
      const finalUrl = await generateWithFallback(url, fallbackUrl)
      return { url: finalUrl }
    })
  )
}