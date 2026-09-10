export type CopyTone = 'professional' | 'casual' | 'luxury' | 'urgent' | 'friendly'
export type CopyContentType = 'full' | 'title' | 'description' | 'bullets' | 'hashtags'

export interface CopyRequest {
  productName: string
  productFeatures?: string
  targetAudience?: string
  marketplace?: string
  tone?: CopyTone
  contentType?: CopyContentType
}

export interface CopyResult {
  title: string
  description: string
  bullets: string[]
  hashtags: string[]
  cta: string
}

export interface CopyGeneration {
  result: CopyResult
  source: 'ai' | 'fallback'
  prompt?: string
}

const MARKETPLACE_LABELS: Record<string, string> = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  tiktok: 'TikTok Shop',
  shein: 'Shein',
}

const TONE_LABELS: Record<CopyTone, string> = {
  professional: 'Profissional',
  casual: 'Casual',
  luxury: 'Luxuoso',
  urgent: 'Urgente',
  friendly: 'Amigável',
}

const TONE_GUIDANCE: Record<CopyTone, string> = {
  professional:
    'Linguagem objetiva, credível e estruturada. Frases diretas, sem gírias, com ênfase em especificações, garantia, durabilidade e segurança. Tom de especialista que inspira confiança.',
  casual:
    'Linguagem descontraída e próxima do cotidiano do brasileiro. Gírias leves, tom de amigo indicando o produto. Frases curtas, espontâneas e com leve humor.',
  luxury:
    'Tom sofisticado e exclusivo. Vocabulário refinado, ênfase em exclusividade, status, acabamento premium e experiência de alto padrão. Evita preço e apelo popular.',
  urgent:
    'Tom de escassez e oportunidade de tempo limitado. Verbos de ação imediata, urgência ("só hoje", "últimas unidades", "esgotando"), pressão positiva para decisão rápida.',
  friendly:
    'Tom acolhedor e caloroso. Usa "você", transmite cuidado, atenção e vínculo. Ênfase em benefícios para o dia a dia, bem-estar e satisfação garantida.',
}

const MARKETPLACE_GUIDANCE: Record<string, string> = {
  shopee:
    'Título com até 120 caracteres com apelo promocional ("Frete Grátis", "Oferta", "Desconto"). Descrição escaneável em parágrafos curtos, destaque de cupom/coletas e CTA de compra rápida.',
  mercadolivre:
    'Título conciso (até 70 caracteres) com Marca + Modelo + principais atributos e status ("Novo | lacrado"). Descrição técnica com ficha de características e garantia. CTA informativo e de confiança.',
  amazon:
    'Título rico em palavras-chave (até 200 caracteres). Descrição longa com 5 bullets de benefícios, perguntas frequentes implícitas e CTA claro. Ótimo para busca interna do marketplace.',
  tiktok:
    'Título curto e chamativo. Hashtags fortes de tendência. Linguagem de vídeo embutida ("link na bio", "corre aqui"). CTA de ação imediata para o público jovem da plataforma.',
  shein:
    'Tom de tendência e estilo. Destaque para material, caimento, novidade da coleção e combinações. Hashtags de moda. CTA alinhado ao mundo fashion.',
}

const TONE_STYLE: Record<CopyTone, { hook: string; bullets: string[]; cta: string; opener: string }> = {
  professional: {
    hook: 'Qualidade Premium + Garantia Oficial',
    bullets: [
      'Qualidade premium comprovada por teste rigoroso',
      'Materiais duráveis, seguros e com certificação',
      'Entrega rápida e rastreada para todo o Brasil',
      'Garantia oficial e suporte especializado',
      'Excelente custo-benefício com retorno garantido',
    ],
    cta: 'CLIQUE EM COMPRAR AGORA E APROVEITE A CONDIÇÃO ESPECIAL!',
    opener:
      'Produto de qualidade excepcional, produzido com materiais premium e acabamento impecável. Projetado para atender aos mais altos padrões de desempenho e durabilidade.',
  },
  casual: {
    hook: 'O queridinho da galera, agora com Frete Grátis!',
    bullets: [
      'Praticidade total pro seu dia a dia',
      'Qualidade que surpreende pelo preço',
      'Chega rapidinho na sua casa, sem dor de cabeça',
      'Fácil de usar, direto da caixa',
      'Curtiu? Corre que é sucesso!',
    ],
    cta: 'BORA COMPRAR ANTES QUE ACABE? CLICA AGORA!',
    opener:
      'Se você está procurando aquele produto que resolve sua vida sem complicação, achou! Feito pra facilitar seu dia a dia com qualidade de verdade e preço justo.',
  },
  luxury: {
    hook: 'Exclusividade e Sofisticação em Cada Detalhe',
    bullets: [
      'Acabamento refinado de altíssimo padrão',
      'Edição exclusiva para quem busca o excepcional',
      'Experiência premium do primeiro ao último uso',
      'Select material e design de inspiração internacional',
      'Um verdadeiro símbolo de bom gosto',
    ],
    cta: 'ASSUMA A EXPERIÊNCIA EXCLUSIVA. COMPRE AGORA.',
    opener:
      'Uma peça pensada para quem reconhece o valor da excelência. Cada detalhe foi cuidadosamente lapidado para oferecer sofisticação, durabilidade e uma experiência verdadeiramente premium.',
  },
  urgent: {
    hook: 'ÚLTIMAS UNIDADES! Esgotando Agora!',
    bullets: [
      'Oferta por tempo LIMITADO, não perca',
      'Últimas unidades em estoque',
      'Frete grátis SOMENTE hoje',
      'Desconto imperdível por poucas horas',
      'Garanta o seu antes que acabe',
    ],
    cta: 'CLIQUE JÁ E GARANTA O SEU ANTES QUE ACABE!',
    opener:
      'Atenção: essa oportunidade NÃO vai durar! Estoque limitado e a demanda está altíssima. Quem espera perde a condição especial desta semana. Agora é o momento de garantir.',
  },
  friendly: {
    hook: 'Feito com Carinho para Você',
    bullets: [
      'Pensado para deixar seu dia a dia melhor',
      'Você vai amar a praticidade e o conforto',
      'Qualidade com cuidado em cada detalhe',
      'Você merece o melhor, e é isso que entregamos',
      'Sua satisfação é a nossa maior alegria',
    ],
    cta: 'VEM COM A GENTE? CLIQUE EM COMPRAR E SEJA FELIZ!',
    opener:
      'Oi! Sabemos como é importante encontrar aquilo que faz a diferença no dia a dia. Por isso, preparamos algo especial, feito com muito capricho para cuidar de você.',
  },
}

const SYSTEM_PROMPT =
  'Você é um copywriter sênior especializado em marketplaces brasileiros (Shopee, Mercado Livre, Amazon, TikTok Shop e Shein). Escreva copywriting persuasivo, 100% em português do Brasil (pt-BR) — proibido responder em inglês ou qualquer outro idioma. Use gatilhos emocionais, provas de benefício e palavras de alto poder de conversão. NÃO use emojis. NÃO repita o nome do produto no inicio de cada frase. Responda SOMENTE com os blocos obrigatórios, sem introdução ou comentários.'

function buildPrompt(req: CopyRequest): string {
  const marketplace = req.marketplace || 'shopee'
  const marketplaceLabel = MARKETPLACE_LABELS[marketplace] || 'Marketplace'
  const tone = req.tone || 'professional'
  const toneLabel = TONE_LABELS[tone]
  const toneGuide = TONE_GUIDANCE[tone]
  const marketGuide = MARKETPLACE_GUIDANCE[marketplace] || MARKETPLACE_GUIDANCE.shopee

  const contentTypeRules: Record<CopyContentType, string> = {
    full: 'Gere todos os blocos: [TITULO], [DESCRICAO], [BULLETS], [HASHTAGS] e [CTA].',
    title: 'Gere apenas o bloco [TITULO] com 3 variações separadas por linha.',
    description: 'Gere apenas o bloco [DESCRICAO].',
    bullets: 'Gere apenas o bloco [BULLETS] com 5 a 7 bullets.',
    hashtags: 'Gere apenas o bloco [HASHTAGS] com 8 hashtags.',
  }

  return `TAREFA: Criar copywriting de vendas para o anúncio de um produto em marketplace brasileiro.

PRODUTO: ${req.productName}
CARACTERÍSTICAS E BENEFÍCIOS: ${req.productFeatures?.trim() || 'não informado (use posicionamento genérico de qualidade e benefício realista)'}
PÚBLICO-ALVO: ${req.targetAudience?.trim() || 'consumidor geral do marketplace'}
MARKETPLACE: ${marketplaceLabel}
TOM DE VOZ: ${toneLabel} — ${toneGuide}

REGRAS DO MARKETPLACE (${marketplaceLabel}):
${marketGuide}

FORMATO OBRIGATÓRIO DE RESPOSTA:
${contentTypeRules[req.contentType || 'full']}

Use exatamente estes marcadores:

[TITULO]
[DESCRICAO]
[BULLETS]
[HASHTAGS]
[CTA]

Regras gerais: tudo em português do Brasil, sem caracteres estranhos, sem asteriscos, sem numeração decorativa, bullets um por linha, hashtags separadas por espaço e sem vírgula, CTA com verbo no imperativo coerente com o tom.`
}

function extractSection(text: string, marker: string, nextMarkers: string[]): string {
  const start = text.indexOf(marker)
  if (start === -1) return ''
  const from = start + marker.length
  const remaining = text.slice(from)
  let end = remaining.length
  for (const next of nextMarkers) {
    const idx = remaining.indexOf(next)
    if (idx !== -1 && idx < end) end = idx
  }
  return remaining.slice(0, end).trim()
}

function parseBullets(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 8)
}

function normalizeHashtag(tag: string): string {
  let h = tag.trim()
  if (!h) return ''
  h = h.replace(/[^#\p{L}\p{N}_]/gu, '')
  h = h.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (!h) return ''
  if (!h.startsWith('#')) h = `#${h}`
  return h.toLowerCase()
}

function parseHashtags(raw: string): string[] {
  return raw
    .split(/\s+/)
    .map(normalizeHashtag)
    .filter(Boolean)
    .slice(0, 10)
}

function parseCopyResult(raw: string): Partial<CopyResult> {
  const sections = ['[TITULO]', '[DESCRICAO]', '[BULLETS]', '[HASHTAGS]', '[CTA]']
  const get = (marker: string) => extractSection(raw, marker, sections.filter((s) => s !== marker))

  return {
    title: get('[TITULO]'),
    description: get('[DESCRICAO]'),
    bullets: parseBullets(get('[BULLETS]')),
    hashtags: parseHashtags(get('[HASHTAGS]')),
    cta: get('[CTA]'),
  }
}

export function buildFallbackCopy(req: CopyRequest): CopyResult {
  const name = req.productName
  const features = req.productFeatures?.trim() || 'Produto original, novo e com garantia do fabricante.'
  const audience = req.targetAudience?.trim()
  const marketplace = req.marketplace || 'shopee'
  const marketplaceLabel = MARKETPLACE_LABELS[marketplace] || 'Marketplace'
  const tone = req.tone || 'professional'
  const style = TONE_STYLE[tone]

  const title = `${name} | ${style.hook} | ${marketplaceLabel}`
  const audienceLine = audience ? `\n\nPerfeito para: ${audience}.` : ''

  const description = `${style.opener}\n\nBENEFÍCIOS:\n${style.bullets.map((b) => `- ${b}`).join('\n')}\n\nCARACTERÍSTICAS:\n${features}\n\n${audienceLine}\n\nNão perca essa oportunidade! Aproveite as condições especiais desta semana.`

  return {
    title,
    description,
    bullets: [...style.bullets, 'Frete e entrega garantidos', 'Produto original e lacrado'].slice(0, 7),
    hashtags: [
      `#${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
      '#oferta',
      '#fretegratis',
      '#promocao',
      `#${marketplace.replace(/\s+/g, '').toLowerCase()}`,
      '#compraonline',
      '#qualidade',
      '#imperdivel',
    ],
    cta: style.cta,
  }
}

export async function generateCopy(req: CopyRequest): Promise<CopyGeneration> {
  const prompt = buildPrompt(req)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)

    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&system=${encodeURIComponent(SYSTEM_PROMPT)}`
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })

    clearTimeout(timer)

    if (!response.ok) {
      throw new Error(`API de texto indisponível (status ${response.status})`)
    }

    const raw = await response.text()
    if (!raw.trim()) {
      throw new Error('API de texto retornou resposta vazia')
    }

    if (raw.length > 15000) {
      throw new Error('Resposta da API muito longa')
    }

    const parsed = parseCopyResult(raw)
    const fallback = buildFallbackCopy(req)

    const title = parsed.title?.trim()
    const description = parsed.description?.trim()
    const bullets = parsed.bullets || []
    const hashtags = parsed.hashtags || []

    if (!title || !description || bullets.length === 0) {
      return { result: fallback, source: 'fallback', prompt }
    }

    const result: CopyResult = {
      title,
      description,
      bullets,
      hashtags: hashtags.length ? hashtags : fallback.hashtags,
      cta: parsed.cta?.trim() || fallback.cta,
    }

    return { result, source: 'ai', prompt }
  } catch (error) {
    return { result: buildFallbackCopy(req), source: 'fallback', prompt }
  }
}