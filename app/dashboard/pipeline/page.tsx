"use client"
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Sparkles, Loader2, Play, Film, CheckCircle2, Link as LinkIcon, Zap, Download, Clock, User, Eye } from 'lucide-react'

export default function PipelinePage() {
  const { user, credits, unlimited, hasCredits, refreshCredits } = useAuth()
  const { toast } = useToast()

  // Realistic flow states
  const [productUrl, setProductUrl] = useState('')
  const [extracted, setExtracted] = useState<any>(null)
  const [extracting, setExtracting] = useState(false)
  const [models, setModels] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState<any>(null)
  const [realisticLoading, setRealisticLoading] = useState(false)
  const [realisticResult, setRealisticResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])

  useEffect(()=>{ if(user){ fetchModels(); fetchHistory() } },[user])

  const fetchModels = async()=>{
    const {data:{session}}=await supabase.auth.getSession()
    const token=session?.access_token||''
    const res=await fetch('/api/v1/pipeline/models',{headers:{Authorization:`Bearer ${token}`}})
    const data=await res.json()
    if(data.models) setModels(data.models)
  }
  const fetchHistory = async()=>{
    const {data}=await supabase.from('generated_content').select('*').eq('user_id', user!.id).eq('type','video').order('created_at',{ascending:false}).limit(12)
    if(data) setHistory(data)
  }

  const handleExtract = async()=>{
    if(!productUrl) return toast({title:'URL obrigatória', variant:'destructive'})
    setExtracting(true); setExtracted(null)
    try{
      const res=await fetch('/api/v1/pipeline/extract-preview',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url: productUrl})})
      const data=await res.json()
      if(!res.ok) throw new Error(data.error||'Falha ao extrair')
      if(!data.image) throw new Error('Não foi possível extrair imagem do produto. Tente outra URL.')
      setExtracted(data)
      toast({title:'Produto extraído!', description: data.title?.slice(0,60) || 'Imagem encontrada'})
    }catch(e:any){ toast({title:'Erro', description:e.message, variant:'destructive'})}
    finally{ setExtracting(false)}
  }

  const handleRealistic = async()=>{
    if(!extracted?.image) return toast({title:'Extraia o produto primeiro', variant:'destructive'})
    if(!selectedModel) return toast({title:'Selecione a modelo', description:'Escolha uma modelo já cadastrada', variant:'destructive'})
    if(!hasCredits(4)) return toast({title:'Créditos insuficientes', description:'Vídeo realista requer 4 créditos', variant:'destructive'})
    setRealisticLoading(true); setRealisticResult(null)
    try{
      const {data:{session}}=await supabase.auth.getSession()
      const token=session?.access_token||''
      const res=await fetch('/api/v1/pipeline/generate-realistic',{method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`}, body:JSON.stringify({ productUrl, modelId: selectedModel.id })})
      const data=await res.json()
      if(!res.ok) throw new Error(data.error||'Erro ao gerar vídeo')
      setRealisticResult(data); fetchHistory(); refreshCredits()
      toast({title:'Vídeo ultra-realista gerado!', description:`${data.productTitle} + ${data.modelUsed}`})
    }catch(e:any){ toast({title:'Erro vídeo', description:e.message, variant:'destructive'})}
    finally{ setRealisticLoading(false)}
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-500 flex items-center justify-center"><Film className="w-5 h-5 text-white"/></div>
            Vídeo Realista com Modelo IA
          </h1>
          <p className="text-slate-400 mt-1">URL → imagem real do produto → modelo cadastrada → vídeo 9:16 TikTok pronto para baixar</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
          <Zap className="w-5 h-5 text-fuchsia-400"/>
          {unlimited ? <span className="text-cyan-400 font-semibold">Ilimitado</span> : <><span className="text-white font-semibold">{credits}</span><span className="text-slate-400 text-sm">créditos</span></>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><LinkIcon className="w-4 h-4"/>1. Produto (URL)</CardTitle><CardDescription>Cole a URL da Shopee/ML/Amazon e extraia a imagem real</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500"/>
                <Input value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="https://shopee.com.br/produto/..." className="pl-10 bg-slate-800 border-slate-700 text-white"/>
              </div>
              <Button onClick={handleExtract} disabled={extracting} className="bg-fuchsia-500 hover:bg-fuchsia-600 shrink-0">
                {extracting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Extraindo...</> : <><Eye className="w-4 h-4 mr-2"/>Extrair</>}
              </Button>
            </div>
            {extracted ? (
              <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-800 p-3 flex gap-3">
                <img src={extracted.image} alt="produto" className="w-24 h-24 object-cover rounded-lg border border-slate-700 shrink-0"/>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white line-clamp-2">{extracted.title || 'Produto'}</p>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{extracted.description || extracted.siteName || ''}</p>
                  <Badge className="mt-2 bg-emerald-500/20 text-emerald-400 border-0 text-xs"><CheckCircle2 className="w-3 h-3 mr-1"/>Imagem real extraída</Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <LinkIcon className="w-8 h-8 text-slate-600 mx-auto mb-2"/>
                <p className="text-sm text-slate-400">Cole a URL e clique em Extrair para ver o produto</p>
                <p className="text-xs text-slate-500 mt-1">Vamos navegar até a URL e buscar og:image + JSON-LD</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><User className="w-4 h-4"/>2. Modelo cadastrada</CardTitle><CardDescription>Escolha uma modelo já criada no sistema (gerada em /Modelos Virtuais)</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {models.length===0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
                <User className="w-8 h-8 text-slate-600 mx-auto mb-2"/>
                <p className="text-sm text-slate-400">Nenhuma modelo cadastrada</p>
                <p className="text-xs text-slate-500 mt-1">Vá em <span className="text-fuchsia-400">Modelos Virtuais</span> e gere 1 modelo primeiro. Ela aparecerá aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {models.map((m:any)=>(
                  <button key={m.id} onClick={()=>setSelectedModel(m)} className={`rounded-xl overflow-hidden border-2 bg-slate-800 aspect-[3/4] relative group ${selectedModel?.id===m.id?'border-fuchsia-500':'border-slate-700 hover:border-slate-600'}`}>
                    <img src={m.url} alt={m.name} className="w-full h-full object-cover"/>
                    {selectedModel?.id===m.id && <div className="absolute inset-0 bg-fuchsia-500/20 flex items-center justify-center"><CheckCircle2 className="w-8 h-8 text-white drop-shadow"/></div>}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                      <p className="text-[11px] text-white truncate">{m.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedModel && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Selecionada: {selectedModel.name}</p>}
            <Button className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600 h-12 font-semibold" onClick={handleRealistic} disabled={realisticLoading || !extracted || !selectedModel || !hasCredits(4)}>
              {realisticLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/>Gerando vídeo ultra-realista...</> : <><Sparkles className="w-5 h-5 mr-2"/>Gerar vídeo realista (9:16) {unlimited?'':'- 4 créditos'}</>}
            </Button>
            <p className="text-xs text-slate-500 text-center">Fidelidade: usa imagem real do produto + rosto da modelo cadastrada + prompt enriquecido (sem geração aleatória)</p>
          </CardContent>
        </Card>
      </div>

      {realisticResult && (
        <Card className="bg-slate-900/50 border-emerald-500/30">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><Film className="w-5 h-5 text-emerald-400"/>Vídeo pronto para TikTok</CardTitle><CardDescription>{realisticResult.productTitle} + {realisticResult.modelUsed} — ultra-realista</CardDescription></CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-6 items-center">
            <div className="aspect-[9/16] w-[300px] rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
              <video src={realisticResult.videoUrl} controls autoPlay loop playsInline className="w-full h-full object-cover"/>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex gap-3">
                <img src={realisticResult.productImage} alt="prod" className="w-16 h-16 rounded-lg object-cover border border-slate-700"/>
                <img src={realisticResult.modelUrl} alt="modelo" className="w-16 h-16 rounded-lg object-cover border border-slate-700"/>
                <div className="text-xs text-slate-400">
                  <p className="text-white font-medium line-clamp-2">{realisticResult.productTitle}</p>
                  <p className="mt-1">Modelo: {realisticResult.modelUsed}</p>
                </div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3 border border-slate-700">
                <p className="text-xs font-semibold text-fuchsia-400">Scripts AIDA</p>
                {(realisticResult.scripts||[]).map((s:string,i:number)=><p key={i} className="text-xs text-slate-300 mt-1"><span className="text-slate-500">{['Hook','Valor','CTA'][i]}:</span> {s}</p>)}
              </div>
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={()=>{ const a=document.createElement('a'); a.href=realisticResult.videoUrl; a.download=`vitrine-realista-${Date.now()}.mp4`; a.click()}}><Download className="w-4 h-4 mr-2"/>Baixar vídeo (9:16)</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length>0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><Clock className="w-5 h-5 text-fuchsia-400"/>Histórico</CardTitle></CardHeader>
          <CardContent><div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">{history.map(h=>(
            <div key={h.id} className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700 aspect-[9/16] relative group">
              {h.result_url ? <video src={h.result_url} muted loop playsInline preload="metadata" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-slate-600"/></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                <span className="text-xs text-white line-clamp-1">{h.product_name||'Produto'}</span>
                <Button size="sm" className="mt-1 bg-fuchsia-500 h-7 text-xs" onClick={()=>window.open(h.result_url,'_blank')}><Download className="w-3 h-3 mr-1"/>Baixar</Button>
              </div>
            </div>
          ))}</div></CardContent>
        </Card>
      )}
    </div>
  )
}
