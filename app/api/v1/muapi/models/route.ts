import { NextResponse } from 'next/server'
import { t2iModels, i2iModels, t2vModels, i2vModels, lipsyncModels, v2vModels } from '@/lib/studio/models'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Retorna catálogo MuAPI resumido para pipeline UI
  const summarize = (arr: any[]) => arr.slice(0, 50).map(m=> ({ id: m.id, name: m.name, provider: m.provider, provider_name: m.provider_name, endpoint: m.endpoint || m.id }))
  return NextResponse.json({
    t2i: summarize(t2iModels),
    i2i: summarize(i2iModels || []),
    t2v: summarize(t2vModels || []),
    i2v: summarize(i2vModels || []),
    lipsync: summarize(lipsyncModels || []),
    v2v: summarize(v2vModels || []),
    counts: { t2i: t2iModels.length, i2i: (i2iModels||[]).length, t2v: (t2vModels||[]).length, i2v: (i2vModels||[]).length, lipsync: (lipsyncModels||[]).length, total: t2iModels.length + (t2vModels||[]).length + (i2vModels||[]).length },
    hasServerKey: !!process.env.MUAPI_API_KEY,
  })
}
