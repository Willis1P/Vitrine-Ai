import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const UPSTREAM = 'https://api.muapi.ai'
async function proxy(req: NextRequest, ctx: { params: { path?: string[] } }) {
  const path = ctx.params.path?.join('/') || ''
  const search = new URL(req.url).search
  const upstreamUrl = `${UPSTREAM}/workflow/${path}${search}`
  let apiKey = req.headers.get('x-api-key') || ''
  if (!apiKey) { const c=req.headers.get('cookie')||''; const m=c.match(/muapi_key=([^;]+)/); if(m) apiKey=decodeURIComponent(m[1]) }
  if (!apiKey) apiKey = process.env.MUAPI_API_KEY||''
  const headers: Record<string,string> = {}
  const ct=req.headers.get('content-type'); if(ct) headers['content-type']=ct
  if(apiKey) headers['x-api-key']=apiKey
  let body: ArrayBuffer|undefined
  if(req.method!=='GET'&&req.method!=='HEAD') body=await req.arrayBuffer()
  try { const res=await fetch(upstreamUrl,{method:req.method,headers,body}); const buf=await res.arrayBuffer(); return new NextResponse(buf,{status:res.status, headers:{'content-type':res.headers.get('content-type')||'application/json'}})} catch(e:any){ return NextResponse.json({error:e?.message},{status:502})}
}
export async function GET(r:NextRequest,c:{params:{path?:string[]}}){return proxy(r,c)}
export async function POST(r:NextRequest,c:{params:{path?:string[]}}){return proxy(r,c)}
export async function DELETE(r:NextRequest,c:{params:{path?:string[]}}){return proxy(r,c)}
