const DEFAULT_MAX_CHARS = 34
const DEFAULT_MIN_MS = 600

export function wrapLine(text: string, maxChars = DEFAULT_MAX_CHARS): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ['']
  if (clean.length <= maxChars) return [clean]

  const sentenceRe = /[.!?]\s+/g
  const sentences: string[] = []
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = sentenceRe.exec(clean)) !== null) {
    sentences.push(clean.slice(lastIdx, m.index + 1).trim())
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < clean.length) sentences.push(clean.slice(lastIdx).trim())

  const pieces: string[] = []
  for (const sentence of sentences) {
    if (sentence.length <= maxChars) {
      pieces.push(sentence)
    } else {
      const words = sentence.split(' ')
      let current = ''
      for (const word of words) {
        const test = current ? current + ' ' + word : word
        if (test.length > maxChars && current) {
          pieces.push(current)
          current = word
        } else {
          current = test
        }
      }
      if (current) pieces.push(current)
    }
  }

  return pieces.length ? pieces : [clean]
}

export function computeCaptionTimings(
  lines: Array<{ text: string; durationMs: number }>,
  opts?: { minMsPerPiece?: number; maxChars?: number },
): Array<{ startMs: number; endMs: number; text: string }> {
  const minMs = opts?.minMsPerPiece ?? DEFAULT_MIN_MS
  const maxChars = opts?.maxChars
  const result: Array<{ startMs: number; endMs: number; text: string }> = []
  let cursor = 0

  for (const line of lines) {
    const pieces = wrapLine(line.text, maxChars)
    const n = pieces.length
    if (n === 0) continue

    const totalChars = pieces.reduce((s, p) => s + p.length, 0)
    const dur = line.durationMs

    const times: number[] = []
    for (const piece of pieces) {
      const raw = totalChars > 0 ? (piece.length / totalChars) * dur : dur / n
      times.push(Math.max(minMs, Math.round(raw)))
    }

    let sum = times.reduce((a, b) => a + b, 0)
    if (sum !== dur) {
      const factor = dur / sum
      for (let i = 0; i < n; i++) {
        times[i] = Math.round(times[i] * factor)
      }
      sum = times.reduce((a, b) => a + b, 0)
      times[0] += dur - sum
    }

    for (let i = 0; i < n; i++) {
      const startMs = cursor
      const endMs = cursor + times[i]
      result.push({ startMs, endMs, text: pieces[i] })
      cursor = endMs
    }
  }

  return result
}

export function distributeTextsToCaptions(
  texts: string[],
  totalDurationMs: number,
  opts?: { minMsPerPiece?: number; maxChars?: number },
): Array<{ startMs: number; endMs: number; text: string }> {
  const valid = texts.map((t) => t.trim()).filter((t) => t.length > 0)
  const totalChars = valid.reduce((s, t) => s + t.length, 0)
  if (valid.length === 0 || totalChars === 0 || totalDurationMs <= 0) return []

  const lines: Array<{ text: string; durationMs: number }> = valid.map((text) => ({
    text,
    durationMs: Math.round((text.length / totalChars) * totalDurationMs),
  }))
  const sum = lines.reduce((s, l) => s + l.durationMs, 0)
  lines[0].durationMs += totalDurationMs - sum

  return computeCaptionTimings(lines, opts)
}

export function msToSrtTime(ms: number): string {
  const totalMs = Math.max(0, Math.round(ms))
  const h = Math.floor(totalMs / 3600000)
  const m = Math.floor((totalMs % 3600000) / 60000)
  const s = Math.floor((totalMs % 60000) / 1000)
  const milli = totalMs % 1000
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0') +
    ',' +
    String(milli).padStart(3, '0')
  )
}

export function buildSrt(captions: Array<{ startMs: number; endMs: number; text: string }>): string {
  let srt = ''
  for (let i = 0; i < captions.length; i++) {
    const c = captions[i]
    srt += String(i + 1) + '\n' + msToSrtTime(c.startMs) + ' --> ' + msToSrtTime(c.endMs) + '\n' + c.text + '\n\n'
  }
  return srt
}
