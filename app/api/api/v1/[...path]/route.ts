import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const UPSTREAM = 'https://api.muapi.ai'

async function proxy(request: NextRequest, params: { path?: string[] }) {
  const path = params.path?.join('/') || ''
  const search = new URL(request.url).search
  const upstreamUrl = `${UPSTREAM}/api/v1/${path}${search}`

  // Resolve key: header x-api-key > cookie muapi_key > env
  let apiKey = request.headers.get('x-api-key') || request.headers.get('X-API-KEY')
  if (!apiKey) {
    const cookie = request.headers.get('cookie') || ''
    const m = cookie.match(/muapi_key=([^;]+)/)
    if (m) apiKey = decodeURIComponent(m[1])
  }
  if (!apiKey) apiKey = process.env.MUAPI_API_KEY || ''

  const method = request.method
  const headers: Record<string,string> = {}
  // forward content-type
  const ct = request.headers.get('content-type')
  if (ct) headers['content-type'] = ct
  if (apiKey) headers['x-api-key'] = apiKey

  let body: ArrayBuffer | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.arrayBuffer()
  }

  try {
    const res = await fetch(upstreamUrl, { method, headers, body, redirect: 'follow' })
    const buf = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'application/json'
    return new NextResponse(buf, { status: res.status, headers: { 'content-type': contentType } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error', upstream: upstreamUrl }, { status: 502 })
  }
}

export async function GET(req: NextRequest, ctx: { params: { path?: string[] } }) { return proxy(req, ctx.params) }
export async function POST(req: NextRequest, ctx: { params: { path?: string[] } }) { return proxy(req, ctx.params) }
export async function PUT(req: NextRequest, ctx: { params: { path?: string[] } }) { return proxy(req, ctx.params) }
export async function DELETE(req: NextRequest, ctx: { params: { path?: string[] } }) { return proxy(req, ctx.params) }
export async function PATCH(req: NextRequest, ctx: { params: { path?: string[] } }) { return proxy(req, ctx.params) }
