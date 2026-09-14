"use client"
import { useState } from 'react'
import StudioShell from '@/components/studio/StudioShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Sparkles, Loader2, Image as ImageIcon, Video, Mic, Wand2 } from 'lucide-react'
import { getEffectiveMuapiKey, hasMuapiKey } from '@/lib/muapi-studio'

const T2I_IDS = ['flux-dev','flux-schnell','nano-banana','google-imagen4','qwen-image','bytedance-seedream-v3'] as const

export default function StudioPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<'image'|'video'|'lipsync'>('image')
  const [prompt, setPrompt] = useState('A photorealistic product hero image, studio lighting, 9:16 vertical')
  const [modelId, setModelId] = useState('flux-dev')
  const [aspect, setAspect] = useState('1:1')
  const [loading, setLoading] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [muapiAvailable, setMuapiAvailable] = useState(false)

  // check key on mount
  if (typeof window !== 'undefined' && !muapiAvailable) {
    // defer
    setTimeout(()=> setMuapiAvailable(hasMuapiKey()), 0)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast({ title: 'Prompt vazio', variant: 'destructive' })
    setLoading(true); setResultUrl(null)
    try {
      // Client-side generation: usa muapi-studio directly if key else pollinations free
      if (tab === 'image') {
        const { generateImage } = await import('@/lib/muapi-studio')
        const key = getEffectiveMuapiKey()
        // Se tem MuAPI, passa pela API proxy; senão gera free local
        if (key) {
          const res = await generateImage(key, { model: modelId, prompt, aspect_ratio: aspect })
          const url = (res as any).url || (res as any).outputs?.[0] || (res as any).output?.url
          if (!url) throw new Error('Sem URL de retorno')
          setResultUrl(url)
        } else {
          const { generateImageFree } = await import('@/lib/muapi-studio')
          const r = await generateImageFree(prompt)
          setResultUrl(r.url)
        }
        toast({ title: 'Imagem gerada!', description: key ? 'Via MuAPI' : 'Via Pollinations free' })
      } else if (tab === 'video') {
        // Video requer MuAPI
        const key = getEffectiveMuapiKey()
        if (!key) throw new Error('Vídeo requer MUAPI_API_KEY (.env.local) ou BYOK em StudioShell. Imagem free já funciona sem chave.')
        const { generateVideo } = await import('@/lib/muapi-studio')
        const res = await generateVideo(key, { model: 'seedance-lite-t2v', prompt, aspect_ratio: aspect, duration: 5 })
        const url = (res as any).url || (res as any).outputs?.[0]
        if (!url) throw new Error('Sem URL de vídeo')
        setResultUrl(url)
        toast({ title: 'Vídeo gerado!' })
      } else {
        toast({ title: 'Em breve', description: 'LipSync via /studio - use MuAPI direto com sua chave' })
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Falha', variant: 'destructive' })
    } finally { setLoading(false) }
  }

  return (
    <StudioShell title="Studio MuAPI - 400 modelos">
      <div className="flex gap-2 mb-4">
        <Button variant={tab==='image'?'default':'outline'} onClick={()=> setTab('image')} className={tab==='image'?'bg-fuchsia-500 hover:bg-fuchsia-600':''}><ImageIcon className="w-4 h-4 mr-2"/>Image</Button>
        <Button variant={tab==='video'?'default':'outline'} onClick={()=> setTab('video')} className={tab==='video'?'bg-fuchsia-500 hover:bg-fuchsia-600':''}><Video className="w-4 h-4 mr-2"/>Video</Button>
        <Button variant={tab==='lipsync'?'default':'outline'} onClick={()=> setTab('lipsync')}><Mic className="w-4 h-4 mr-2"/>LipSync</Button>
        <Badge variant="secondary" className="ml-auto bg-slate-800 text-slate-300">{muapiAvailable ? 'MuAPI: pronto' : 'MuAPI: free fallback'}</Badge>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><Wand2 className="w-4 h-4"/>{tab==='image'?'Text-to-Image':tab==='video'?'Text-to-Video':'LipSync'}</CardTitle><CardDescription>Catálogo MuAPI (400+ modelos) + Pollinations free fallback. {tab==='video'?'Vídeo precisa de MUAPI_API_KEY':''}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Prompt</Label>
              <Textarea value={prompt} onChange={e=> setPrompt(e.target.value)} rows={4} className="bg-slate-800 border-slate-700 text-white" placeholder="Descreva a imagem/vídeo..."/>
            </div>
            {tab !== 'lipsync' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300">Modelo</Label>
                  <Select value={modelId} onValueChange={setModelId}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {T2I_IDS.map(id=> <SelectItem key={id} value={id}>{id}</SelectItem>)}
                      <SelectItem value="flux-kontext-pro-t2i">flux-kontext-pro</SelectItem>
                      <SelectItem value="hidream-i1-fast">hidream-i1-fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Aspect</Label>
                  <Select value={aspect} onValueChange={setAspect}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1</SelectItem>
                      <SelectItem value="16:9">16:9</SelectItem>
                      <SelectItem value="9:16">9:16</SelectItem>
                      <SelectItem value="3:4">3:4</SelectItem>
                      <SelectItem value="4:3">4:3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <Button onClick={handleGenerate} disabled={loading} className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600 h-11 font-semibold">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Gerando...</> : <><Sparkles className="w-4 h-4 mr-2"/>Gerar {tab}</>}
            </Button>
            <p className="text-xs text-slate-500">Free: Pollinations flux. MuAPI: 400+ modelos via x-api-key (server .env MUAPI_API_KEY ou BYOK localStorage muapi_key). Veja catálogo completo em <code className="text-slate-300">lib/studio/models.ts</code>.</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader><CardTitle className="text-white">Resultado</CardTitle><CardDescription>URL retornada por MuAPI/Pollinations</CardDescription></CardHeader>
          <CardContent>
            {resultUrl ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700 aspect-square flex items-center justify-center">
                  {tab==='video' ? <video src={resultUrl} controls autoPlay loop playsInline className="w-full h-full object-cover"/> : <img src={resultUrl} alt="result" className="w-full h-full object-cover"/>}
                </div>
                <Button variant="outline" className="w-full" onClick={()=> window.open(resultUrl!, '_blank')}>Abrir original</Button>
                <p className="text-xs break-all text-slate-400">{resultUrl}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
                <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2"/>
                <p className="text-sm text-slate-400">Gere para ver o resultado aqui</p>
                <p className="text-xs text-slate-500 mt-1">MuAPI usa polling submitAndPoll; free usa Pollinations direto.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/30 border-slate-800 mt-4">
        <CardHeader><CardTitle className="text-white text-sm">Catálogo MuAPI</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400">400+ modelos disponíveis em <code className="text-slate-200">lib/studio/models.ts</code>: t2iModels ({`{`}t2i{`}`}), i2iModels, t2vModels, i2vModels, lipsyncModels, v2vModels, audioModels. Helpers: getModelById, getVideoModelById, getI2VModelById, etc. Troque <code className="text-slate-200">modelId</code> para usar qualquer endpoint MuAPI. Fallback mantém Pollinations free quando MUAPI_API_KEY ausente.</p>
        </CardContent>
      </Card>
    </StudioShell>
  )
}
