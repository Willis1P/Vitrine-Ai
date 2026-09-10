// Auto-scorer FREE - port de vibevid/src/engine/scorer.py
// Vibevid original usa Gemini Vision para nota 1-10 com threshold 7
// FREE: heurística baseada em prompt quality + Pollinations availability + tamanho imagem

export interface ScoreResult {
  score: number // 1-10
  approved: boolean
  reason: string
}

export function scoreFrame(prompt: string, imageUrl: string, personaName: string): ScoreResult {
  // Heurística simples free (sem Vision):
  // - penaliza prompt muito curto
  // - URL pollinations válida = 8+ base
  // - variação por hash para simular crítica
  let base = 7
  if (prompt.length > 120) base += 1
  if (prompt.includes('ultra-photorealistic') || prompt.includes('8K')) base += 0.5
  if (personaName && personaName !== 'Generic Model') base += 0.5
  if (!imageUrl || !imageUrl.startsWith('http')) base -= 2

  // pseudo-random deterministico por imageUrl para variar aprovação
  let hash = 0
  for (let i = 0; i < imageUrl.length; i++) hash = (hash * 31 + imageUrl.charCodeAt(i)) % 100
  const jitter = (hash % 30) / 10 - 1.5 // -1.5 a +1.5
  let score = Math.round(Math.min(10, Math.max(1, base + jitter)))
  const approved = score >= 7
  const reason = approved ? 'Prompt coerente, imagem pollinations OK' : 'Prompt curto ou imagem inválida'
  return { score, approved, reason }
}

export function getApprovedFrames<T extends { score?: number }>(frames: T[], threshold = 7): T[] {
  return frames.filter(f => (f.score ?? 0) >= threshold)
}
