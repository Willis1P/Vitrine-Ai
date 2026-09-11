export type ScriptAudience = 'geral' | 'skincare' | 'tech' | 'casa' | 'beleza'

export interface GenerateScriptInput {
  productName: string
  sellingPoints?: string[]
  reviews?: string[]
  price?: number | null
  currency?: string
  audiencia?: ScriptAudience
  tomHook?: number
}

export interface GenerateScriptResult {
  provider: 'pollinations' | 'template'
  hook: string
  script: string[]
  cta: string
  full: string
}

interface ParsedScript {
  hook?: string
  script?: string[]
  cta?: string
}

export const POLLINATIONS_POST_URL = 'https://text.pollinations.ai/openai'
export const POLLINATIONS_GET_URL = 'https://text.pollinations.ai'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 2000
const TIMEOUT_MS = 45000

const AUDIENCE_GUIDANCE: Record<ScriptAudience, string> = {
  geral: 'público geral brasileiro, linguagem simples e universal',
  skincare: 'pessoas que cuidam da pele, tom de autocuidado e resultados visíveis',
  tech: 'apaixonados por tecnologia, destaque de funcionalidade e custo-benefício',
  casa: 'quem ama praticidade e organização da casa',
  beleza: 'entusiastas de beleza e cosméticos, tom de transformação',
}

const HOOK_BANK: string[] = [
  'A Shopee tá maluca mandando isso pra minha casa',
  'Não compra isso antes de ver esse vídeo',
  'Olha o que eu achei na internet por esse preço',
  'Eu testei por uma semana e olha no que deu',
  'Gente, eu encontrei a solução de um problema que eu nem sabia que tinha',
  'Tá todo mundo falando desse produto e eu preciso entender por que',
  'Comprei achando que era golpe e me surpreendi',
  'Se você tá procurando isso, para tudo agora',
]

const CTA_WITH_PRICE = 'Aproveita que tá só por R$ {price} e clica no carrinho!'
const CTA_NO_PRICE = 'Corre que ainda dá tempo e clica no carrinho agora!'
const CTA_FALLBACK = 'Clica no carrinho antes que acabe o estoque!'

const GENERIC_BENEFITS: Record<ScriptAudience, string[]> = {
  geral: [
    'tem um preço que cabe no bolso e frete que chega rapidinho',
    'é fácil de usar, sai da caixa já pronto',
    'a qualidade surpreende pros olhos e pro bolso',
  ],
  skincare: [
    'deixa a pele com aquela sensação de cuidado na hora',
    'a textura é leve e rende bastante no uso diário',
    'vem com jeito do produto original, sem desandar na pele',
  ],
  tech: [
    'a performance entrega muito mais do que o preço pede',
    'a montagem é simples e funciona de primeira',
    'o acabamento passa confiança pra uso diário',
  ],
  casa: [
    'ajuda a organizar e ganhar tempo no dia a dia',
    'o material aguenta o corre de casa sem desgastar',
    'achar isso nesse preço tá difícil hoje em dia',
  ],
  beleza: [
    'o acabamento valoriza o visual sem esforço',
    'a durabilidade surpreende no uso do dia a dia',
    'o custo-benefício tá fora de série pra categoria',
  ],
}

const PAIN_LINES: Record<ScriptAudience, string[]> = {
  geral: [
    'todo mundo tá cansado de gastar caro em coisa que não dura nada, né?',
    'a gente se frusta com produto que não faz nem metade do que promete.',
  ],
  skincare: [
    'quem tem pele sensível sofre tentando achar produto que não arde nem resseca.',
    'gastar em creme caro que não melhora a pele é desanimador pra qualquer um.',
  ],
  tech: [
    'já comprou periférico barato que travava em minutos? Pois é.',
    'nada pior que investir em eletrônico que não entrega o que promete.',
  ],
  casa: [
    'organizar a casa sempre vira a maior dor de cabeça, não é?',
    'comprar utilidade doméstica que quebra na primeira semana é fogo.',
  ],
  beleza: [
    'quem ama make sabe o drama de produto que não dura nem no braço.',
    'ninguém aguenta mais gastar alto em coisa que não valoriza nada.',
  ],
}

function stripListMarker(line: string): string {
  return line.replace(/^\s*(?:\d+[.)\-\u2013]|[•\-\u2022*])\s*/, '').trim()
}

function capFirst(s: string): string {
  if (!s) return s
  return s[0].toUpperCase() + s.slice(1)
}

function cleanScriptLines(lines: string[], maxLines = 9): string[] {
  const out: string[] = []
  for (const raw of lines) {
    const line = capFirst(stripListMarker(String(raw ?? '')).replace(/\s+/g, ' ').trim())
    if (line && !out.includes(line)) out.push(line)
    if (out.length >= maxLines) break
  }
  return out
}

function cleanHook(hook: string): string {
  return String(hook ?? '').replace(/^["']|["']$/g, '').replace(/\s+/g, ' ').trim()
}

function extractJson(text: string): ParsedScript | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fenced ? fenced[1] : text
  const startIdx = candidate.indexOf('{')
  if (startIdx === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = startIdx; i < candidate.length; i++) {
    const ch = candidate[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          const parsed: unknown = JSON.parse(candidate.slice(startIdx, i + 1))
          if (parsed && typeof parsed === 'object') {
            const obj = parsed as Record<string, unknown>
            const script: unknown = obj.script
            return {
              hook: typeof obj.hook === 'string' ? obj.hook : undefined,
              script: Array.isArray(script) ? script.map((s) => String(s)) : undefined,
              cta: typeof obj.cta === 'string' ? obj.cta : undefined,
            }
          }
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function findFirstBalancedObject(text: string): ParsedScript | null {
  try {
    return extractJson(text)
  } catch {
    return null
  }
}

function buildSystemPrompt(): string {
  return [
    'Você é um roteirista de TikTok viral para afiliados brasileiros.',
    'Responda SEMPRE com JSON puro e mínimo, sem blocos de código, sem textos fora do JSON, sem vírgulas finais.',
    'Formato exato: {"hook":"...","script":["linha 1","linha 2","linha 3","linha 4","linha 5","linha 6","linha 7","linha 8"],"cta":"..."}',
    'Regras:',
    '- hook: frase de até 10 palavras, com curiosidade ou identificação imediata do público.',
    '- script: de 6 a 8 linhas curtas faladas (máximo ~140 caracteres cada), misturando a dor do problema e até 3 benefícios baseados nas avaliações quando houver.',
    '- cta: frase de chamada para ação mencionando o preço quando informado.',
    '- Proibido exageros falsos, promessas de saúde ou milagres.',
    '- Tom brasileiro com gírias leves (ex: "mt bom", "top", "cara").',
    '- Tudo em português do Brasil (pt-BR).',
  ].join('\n')
}

function buildUserPrompt(input: GenerateScriptInput): string {
  const name = input.productName
  const sellingPoints = (input.sellingPoints || []).filter((s) => s && s.trim()).slice(0, 3)
  const reviews = (input.reviews || []).filter((r) => r && r.trim()).slice(0, 3)

  const pricePart =
    typeof input.price === 'number' && isFinite(input.price) && input.price > 0
      ? `O preço do produto é ${input.currency || 'R$'} ${formatPrice(input.price)}.`
      : ''

  const pointsPart = sellingPoints.length ? `Principais pontos de venda:\n- ${sellingPoints.join('\n- ')}` : ''

  let reviewsPart = ''
  if (reviews.length > 0) {
    const quoted = reviews.map((r) => `"${r.length > 120 ? `${r.slice(0, 120)}...` : r}"`).join('\n- ')
    reviewsPart = `Avaliações de clientes:\n- ${quoted}`
  } else {
    reviewsPart = 'Sem avaliações disponíveis, use benefícios realistas do produto.'
  }

  return [
    `Produto: ${name}`,
    pointsPart,
    reviewsPart,
    pricePart,
    `Público: ${AUDIENCE_GUIDANCE[input.audiencia || 'geral']}`,
    'Gere o roteiro viral agora.',
  ]
    .filter(Boolean)
    .join('\n')
}

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function postToPollinations(messages: { role: string; content: string }[]): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(POLLINATIONS_POST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages,
          seed: 42,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`status ${response.status}`)
      const text = await response.text()
      if (!text.trim()) throw new Error('vazio')
      return text
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS)
    }
  }
  throw lastError
}

async function getFromPollinations(prompt: string, system: string): Promise<string> {
  const url = `${POLLINATIONS_GET_URL}/${encodeURIComponent(prompt)}?model=openai&system=${encodeURIComponent(system)}&json=true`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`status ${response.status}`)
  const text = await response.text()
  if (!text.trim()) throw new Error('vazio')
  return text
}

async function tryPollinations(input: GenerateScriptInput): Promise<GenerateScriptResult | null> {
  const system = buildSystemPrompt()
  const user = buildUserPrompt(input)
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]

  let raw = ''
  try {
    raw = await postToPollinations(messages)
  } catch {
    try {
      raw = await getFromPollinations(user, system)
    } catch {
      return null
    }
  }

  if (raw.trim().startsWith('{')) {
    const parsed = findFirstBalancedObject(raw)
    if (parsed && (parsed.hook || parsed.script?.length || parsed.cta)) {
      return buildResult(parsed, input, 'pollinations')
    }
  }

  const parsed = findFirstBalancedObject(raw)
  if (parsed && (parsed.hook || parsed.script?.length || parsed.cta)) {
    return buildResult(parsed, input, 'pollinations')
  }

  return null
}

function buildResult(parsed: ParsedScript, input: GenerateScriptInput, provider: GenerateScriptResult['provider']): GenerateScriptResult | null {
  const script = cleanScriptLines(parsed.script || [])
  const hook = cleanHook(parsed.hook || '')
  const cta = String(parsed.cta || '').trim()

  if (script.length === 0 || (!hook && !cta)) return null

  const fallbackTemplate = buildTemplateScript(input)

  const finalHook = hook || fallbackTemplate.hook
  const finalCta = cta || fallbackTemplate.cta
  const finalScript = script.length >= 2 ? script : fallbackTemplate.script

  return {
    provider,
    hook: finalHook,
    script: finalScript,
    cta: finalCta,
    full: [finalHook, ...finalScript, finalCta].join(' '),
  }
}

function buildTemplateScript(input: GenerateScriptInput): GenerateScriptResult {
  const name = input.productName
  const audience = input.audiencia || 'geral'
  const tomHook = input.tomHook ?? Math.floor(Math.random() * HOOK_BANK.length)

  const hook = HOOK_BANK[Math.abs(tomHook) % HOOK_BANK.length]

  const sellingPoints = (input.sellingPoints || []).filter((s) => s && s.trim()).slice(0, 3)
  const genericBenefits = GENERIC_BENEFITS[audience] || GENERIC_BENEFITS.geral

  let benefits: string[]
  if (sellingPoints.length > 0) {
    benefits = sellingPoints.map((point) => point.replace(/\s+/g, ' ').trim()).slice(0, 3)
  } else {
    benefits = [
      `${name} ${genericBenefits[0]}`,
      `${name} ${genericBenefits[1]}`,
      `${name} ${genericBenefits[2]}`,
    ]
  }
  if (benefits.length === 0) benefits = genericBenefits
  if (benefits.length > 3) benefits = benefits.slice(0, 3)

  const reviews = (input.reviews || []).filter((r) => r && r.trim()).slice(0, 1)
  const reviewQuote = reviews.length > 0 ? `Quem comprou fala: "${reviews[0].trim().slice(0, 100)}"` : ''
  const painPool = PAIN_LINES[audience] || PAIN_LINES.geral

  const script: string[] = [
    `${name} veio pra resolver uma coisa que ninguém deveria passar.`,
    painPool[0],
    benefits[0],
    benefits[1],
    reviewQuote,
    benefits[2],
    'Testei aqui em casa e olha, valeu cada centavo.',
    'Clica no link da bio e olha o preço, você não vai acreditar.',
  ].filter(Boolean)

  const amount = typeof input.price === 'number' && isFinite(input.price) && input.price > 0
  const currency = input.currency || 'R$'
  const cta = amount
    ? CTA_WITH_PRICE.replace('{price}', formatPrice(input.price!))
    : CTA_NO_PRICE

  const fullScript = cleanScriptLines(script, 9)

  return {
    provider: 'template',
    hook,
    script: fullScript,
    cta,
    full: [hook, ...fullScript, cta].join(' '),
  }
}

export async function generateScript(input: GenerateScriptInput): Promise<GenerateScriptResult> {
  const template = buildTemplateScript(input)

  try {
    const generated = await tryPollinations(input)
    if (generated) return generated
  } catch {
    return template
  }

  return template
}