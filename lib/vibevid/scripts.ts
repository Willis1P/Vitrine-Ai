// AIDA Script Generator FREE - port de vibevid/src/engine/scripts.py
// Sem Vertex AI: usa Pollinations text (openai) como LLM free, fallback para templates
import { VibevidConfig } from './config'

const HOOK_ANGLES = [
  'abordagem de surpresa: revela um problema que o espectador não sabia que tinha',
  'abordagem de comparação: contrasta o antes e depois',
  'abordagem de desafio: questiona o método atual do espectador',
  'abordagem de urgência: estoque limitado',
  'abordagem de prova social: resultado que outros já tiveram',
  'abordagem de curiosidade: pergunta intrigante',
  'abordagem direta: vai na dor principal',
  'abordagem de revelação: não sabia disso sobre esse produto',
]

const CTA_ANGLES = [
  "ação direta: 'Clica no carrinho laranja aqui embaixo e traz esse aqui pra casa.'",
  "ação simples: 'É um clique no carrinho laranja e tá resolvido.'",
  "urgência de estoque: 'Esse produto some rápido — corre no carrinho laranja.'",
  'entrega rápida: Pede pelo carrinho laranja agora e já chega em dias.',
  "tom de parceiro: 'Se eu fosse você, já tava com o dedo no carrinho laranja aqui embaixo.'",
  'fomo: Quem viu esse vídeo e não pegou vai se arrepender — carrinho laranja aqui embaixo.',
]

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function buildSystemPrompt(productName: string, category: string, personaName: string, frameIndex: number, targetAudience?: string): string {
  const hook = HOOK_ANGLES[frameIndex % HOOK_ANGLES.length]
  const cta = CTA_ANGLES[frameIndex % CTA_ANGLES.length]
  return `Você é um Diretor Criativo de TikTok Shop Brasil.
Produto: ${productName}
Categoria: ${category}
Persona: ${personaName}
Público: ${targetAudience || 'compradores de marketplace'}
Ângulo Hook: ${hook}
Ângulo CTA: ${cta}

Gere EXATAMENTE 3 takes no formato AIDA (Hook / Valor / CTA):
- Take 1 (HOOK): atenção imediata, surpresa/curiosidade.
- Take 2 (VALOR): benefícios, resolve dor, qualidade.
- Take 3 (CTA): chama para clicar no carrinho laranja aqui embaixo.

REGRAS:
- Cada take entre ${VibevidConfig.MIN_WORDS} e ${VibevidConfig.MAX_WORDS} palavras.
- PT-BR, direto e confiante, ritmo falado natural, com acentos.
- Sempre use "aqui embaixo" para o carrinho, nunca "ali".
- Não inicie com "Para tudo".
- Saída: 3 linhas numeradas 1. 2. 3. Sem texto extra.`
}

async function callPollinationsText(prompt: string): Promise<string | null> {
  // Pollinations text free: https://text.pollinations.ai/
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai',
        seed: Math.floor(Math.random() * 100000),
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const text = await res.text()
    return text.trim()
  } catch {
    return null
  }
}

function parseScripts(response: string): string[] {
  const lines = response.split('\n')
  const scripts: string[] = []
  for (const line of lines) {
    let clean = line.trim()
    if (clean && /^\d+\./.test(clean)) {
      clean = clean.replace(/^\d+\.\s*/, '').trim()
    }
    clean = clean.replace(/^["']|["']$/g, '').trim()
    if (clean.length > 40) scripts.push(clean)
    if (scripts.length === 3) break
  }
  return scripts.slice(0, 3)
}

function fallbackScripts(productName: string): string[] {
  return [
    `Nunca vi ${productName} com essa qualidade por esse preço. Presta atenção nesse aqui, sério.`,
    `Esse ${productName} entrega resultado profissional de verdade. Qualidade real, sem enrolação, e todo mundo comenta.`,
    'Esse produto some rápido, corre no carrinho laranja aqui embaixo antes que acabe o estoque.',
  ]
}

function sanitizeScript(text: string): string {
  // vibevid compliance simplificado (sem Vertex)
  return text
    .replace(/\bgarant(e|ido|ia)\b/gi, 'confiante')
    .replace(/\bdevolução\b/gi, 'entrega')
}

export async function generateAidaScripts(
  productName: string,
  category: string,
  personaName: string,
  frameIndex: number = 0,
  targetAudience?: string
): Promise<string[]> {
  const prompt = buildSystemPrompt(productName, category, personaName, frameIndex, targetAudience)
  let scripts: string[] = []

  // tenta LLM free com retry até 2x para word count
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callPollinationsText(prompt + (attempt > 0 ? `\n\nATENÇÃO: cada take deve ter ${VibevidConfig.MIN_WORDS} a ${VibevidConfig.MAX_WORDS} palavras. Reescreva todos.` : ''))
    if (!raw) break
    const parsed = parseScripts(raw)
    if (parsed.length >= 3) {
      const outOfRange = parsed.filter(s => {
        const w = countWords(s)
        return w < VibevidConfig.MIN_WORDS || w > VibevidConfig.MAX_WORDS
      })
      if (outOfRange.length === 0) {
        scripts = parsed
        break
      }
      if (attempt === 0) continue
      scripts = parsed
    }
  }

  if (scripts.length < 3) {
    scripts = fallbackScripts(productName)
  }

  // compliance leve + garante 3
  const sanitized = scripts.slice(0, 3).map(sanitizeScript)
  while (sanitized.length < 3) sanitized.push(fallbackScripts(productName)[sanitized.length])
  return sanitized
}

export function getHookAngles(): string[] { return [...HOOK_ANGLES] }
export function getCtaAngles(): string[] { return [...CTA_ANGLES] }
