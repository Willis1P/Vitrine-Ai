import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const hasServerKey = !!process.env.MUAPI_API_KEY
  const model = process.env.MUAPI_VIDEO_MODEL || 'seedance-lite-t2v'
  return NextResponse.json({ hasServerKey, model, timestamp: Date.now() })
}
