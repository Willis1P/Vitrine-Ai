import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'
import {
  computeCaptionTimings,
  buildSrt,
  distributeTextsToCaptions,
} from '@/lib/captions'

export const dynamic = 'force-dynamic'

const MAX_LINES = 30
const MAX_DURATION_MS = 600_000

interface RawLine {
  text: string
  durationMs: number
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(
    request.headers.get('authorization'),
  )
  if (!user || !supabase)
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (Array.isArray(body.lines)) {
    const rawLines: RawLine[] = []
    for (const item of body.lines) {
      const text = typeof item.text === 'string' ? item.text.trim() : ''
      const dur = Number(item.durationMs)
      if (!text) {
        return NextResponse.json(
          { error: 'Texto vazio em uma ou mais linhas' },
          { status: 400 },
        )
      }
      if (!Number.isFinite(dur) || dur <= 0) {
        return NextResponse.json(
          { error: 'Duração inválida em uma ou mais linhas' },
          { status: 400 },
        )
      }
      rawLines.push({ text, durationMs: dur })
    }

    if (rawLines.length > MAX_LINES) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_LINES} linhas` },
        { status: 400 },
      )
    }

    const totalDurationMs = rawLines.reduce((s, l) => s + l.durationMs, 0)
    if (totalDurationMs > MAX_DURATION_MS) {
      return NextResponse.json(
        { error: 'Duração total máxima de 10 minutos' },
        { status: 400 },
      )
    }

    const captions = computeCaptionTimings(rawLines)
    const srt = buildSrt(captions)
    return NextResponse.json({ srt, captions, totalDurationMs })
  }

  if (Array.isArray(body.texts)) {
    const texts: string[] = body.texts
      .filter((t: any) => typeof t === 'string' && t.trim())
      .map((t: any) => t.trim())

    if (texts.length === 0) {
      return NextResponse.json(
        { error: 'Envie ao menos 1 texto' },
        { status: 400 },
      )
    }

    const totalDurationMs = Number(body.totalDurationMs)
    if (!Number.isFinite(totalDurationMs) || totalDurationMs <= 0) {
      return NextResponse.json(
        { error: 'Duração total inválida' },
        { status: 400 },
      )
    }

    if (texts.length > MAX_LINES) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_LINES} textos` },
        { status: 400 },
      )
    }

    if (totalDurationMs > MAX_DURATION_MS) {
      return NextResponse.json(
        { error: 'Duração total máxima de 10 minutos' },
        { status: 400 },
      )
    }

    const captions = distributeTextsToCaptions(texts, totalDurationMs)
    const srt = buildSrt(captions)
    return NextResponse.json({ srt, captions, totalDurationMs })
  }

  return NextResponse.json(
    { error: 'Envie lines[] ou texts[]' },
    { status: 400 },
  )
}
