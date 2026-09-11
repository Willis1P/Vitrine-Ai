"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { buildDefaultPrompt, LOOKS, PT_BR_VOICES, type LookId } from '@/lib/ugc-shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Video,
  Sparkles,
  Loader2,
  Download,
  Zap,
  Upload,
  X,
  RefreshCw,
  ImageIcon,
  Film,
  Clock,
  CheckCircle2,
  Link2,
  Wand2,
  Captions,
  Search,
} from 'lucide-react'

const UGC_RATIOS = [
  { id: '9:16', label: 'Vertical', sub: '9:16' },
  { id: '16:9', label: 'Widescreen', sub: '16:9' },
  { id: '3:4', label: 'Vertical', sub: '3:4' },
  { id: '1:1', label: 'Quadrado', sub: '1:1' },
]

export default function VideosPage() {
  const { user, credits, unlimited, hasCredits, refreshCredits } = useAuth()
  const { toast } = useToast()

  const [productName, setProductName] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [sellingPoints, setSellingPoints] = useState('')
  const [selectedRatio, setSelectedRatio] = useState('9:16')
  const [look, setLook] = useState<LookId>('brazilian')
  const [voice, setVoice] = useState('pt-BR-FranciscaNeural')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [linkUrl, setLinkUrl] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [scriptBusy, setScriptBusy] = useState(false)
  const [srtBusy, setSrtBusy] = useState(false)

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  useEffect(() => {
    const pts = sellingPoints.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3)
    setPrompt(buildDefaultPrompt(productName || 'meu produto', pts, look))
  }, [look])

  const fetchHistory = async () => {
    if (!user) return
    const { data } = await supabase
      .from('generated_content')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'video')
      .eq('status', 'completed')
      .not('result_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistory(data)
  }

  const syncPrompt = useCallback(() => {
    const pts = sellingPoints.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3)
    setPrompt(buildDefaultPrompt(productName || 'meu produto', pts, look))
  }, [productName, sellingPoints, look])

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return
    const remaining = 10 - images.length
    const list = Array.from(files).slice(0, remaining)
    if (list.length === 0) {
      toast({ title: "Limite atingido", description: "Maximo de 10 imagens", variant: "destructive" })
      return
    }
    setUploading(true)
    const uploaded: string[] = []
    for (const file of list) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `${file.name} muito grande`, description: "Maximo 10MB por imagem", variant: "destructive" })
        continue
      }
      const ext = file.name.split('.').pop() || 'jpg'
      const fpath = `uploads/ugc/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('vittrine-images').upload(fpath, file, { cacheControl: '3600', upsert: false })
      if (error) {
        toast({ title: "Erro no upload", description: error.message, variant: "destructive" })
        continue
      }
      const { data } = supabase.storage.from('vittrine-images').getPublicUrl(fpath)
      uploaded.push(data.publicUrl)
    }
    if (uploaded.length) {
      setImages((prev) => [...prev, ...uploaded].slice(0, 10))
      toast({ title: "Imagens enviadas!", description: `${uploaded.length} imagem(ns) adicionada(s)` })
    }
    setUploading(false)
  }

  const handleGenerate = async () => {
    if (!user) { toast({ title: "Erro", description: "Voce precisa estar logado", variant: "destructive" }); return }
    if (!productName.trim()) { toast({ title: "Nome obrigatorio", description: "Informe o nome do produto", variant: "destructive" }); return }
    if (images.length === 0) { toast({ title: "Imagens obrigatorias", description: "Envie pelo menos 1 imagem do produto", variant: "destructive" }); return }
    if (!hasCredits(4)) { toast({ title: "Creditos insuficientes", description: "Vídeo UGC requer 4 creditos", variant: "destructive" }); return }

    setLoading(true)
    setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const pts = sellingPoints.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3)
      const res = await fetch('/api/v1/ugc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productName: productName.trim(),
          images,
          sellingPoints: pts,
          ratio: selectedRatio,
          prompt: prompt.trim(),
          look,
          voice,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar vídeo')
      setResult(data)
      fetchHistory()
      refreshCredits()
      toast({ title: "Vídeo UGC gerado!", description: data.videoUrl ? "Vídeo criado com sucesso" : "Sucesso" })
    } catch (e: any) {
      toast({ title: "Erro ao gerar vídeo", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const download = (url: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `vitrine-ugc-${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleLinkSearch = async () => {
    if (!user) return
    if (!/^https?:\/\//.test(linkUrl.trim())) { toast({ title: "Link invalido", description: "Cole uma URL de produto (Shopee, AliExpress, Amazon, ML...)", variant: "destructive" }); return }
    setLinkBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch('/api/v1/product/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: linkUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar produto')
      if (!data.ok) {
        toast({ title: "Nao foi possivel extrair", description: data.message || 'Tente colar nome/fotos manualmente', variant: "destructive" })
        return
      }
      if (data.name) setProductName(data.name)
      if (data.images && data.images.length) {
        setImages((prev) => [...prev, ...data.images.filter((u: string) => !prev.includes(u))].slice(0, 10))
      }
      if (!sellingPoints.trim() && data.description) {
        const sentences = data.description.split(/(?<=[.!?])\s+/).map((s: string) => s.trim()).filter(Boolean)
        setSellingPoints(sentences.slice(0, 3).join('\n'))
      }
      const nReviews = data.reviews?.length || 0
      toast({ title: "Produto extraido!", description: `${nReviews > 0 ? nReviews + ' avaliação(ões) coletada(s). ' : ''}${data.images?.length || 0} foto(s) importada(s).` })
      if (nReviews > 0) {
        const pts = (data.reviews as any[] || []).map((r) => String(r.description || '').trim()).filter(Boolean).slice(0, 3)
        if (pts.length) setSellingPoints((prev) => (prev.trim() ? prev + '\n' : '') + pts.join('\n'))
      }
    } catch (e: any) {
      toast({ title: "Erro ao buscar", description: e.message, variant: "destructive" })
    } finally {
      setLinkBusy(false)
    }
  }

  const handleScriptGen = async () => {
    if (!user) return
    if (!productName.trim()) { toast({ title: "Nome obrigatorio", description: "Informe o nome do produto primeiro", variant: "destructive" }); return }
    setScriptBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const pts = sellingPoints.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3)
      const res = await fetch('/api/v1/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productName: productName.trim(), sellingPoints: pts, audiencia: 'geral' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar roteiro')
      setSellingPoints(data.script.join('\n'))
      toast({ title: "Roteiro viral pronto!", description: `Hook: ${data.hook}`, duration: 6000 })
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" })
    } finally {
      setScriptBusy(false)
    }
  }

  const handleSrt = async () => {
    if (!user || !result) return
    setSrtBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const totalDurationMs = Math.max(1000, Math.round((result.durationSeconds || 24) * 1000))
      const texts = (result.scripts || sellingPoints.split('\n').map((s) => s.trim()).filter(Boolean))
      const res = await fetch('/api/v1/captions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ texts, totalDurationMs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar legendas')
      const blob = new Blob([data.srt], { type: 'application/x-subrip' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `vitrine-ugc-legendas.srt`
      a.click()
      URL.revokeObjectURL(a.href)
      toast({ title: "Legendas geradas!", description: `${data.captions?.length || 0} legendas no arquivo .srt` })
    } catch (e: any) {
      toast({ title: "Erro nas legendas", description: e.message, variant: "destructive" })
    } finally {
      setSrtBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            Vídeo Promocional UGC
          </h1>
          <p className="text-slate-400 mt-1">Crie vídeos curtos de influenciadores de alta conversão para seus produtos com apenas um clique</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
          <Zap className="w-5 h-5 text-violet-400" />
          {unlimited ? <span className="text-white font-semibold text-cyan-400">Ilimitado</span> : (
            <>
              <span className="text-white font-semibold">{credits}</span>
              <span className="text-slate-400 text-sm">creditos</span>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">
              <span className="text-red-400">*</span> Nome do Produto
            </CardTitle>
            <CardDescription>Nome do produto que aparecerá no anúncio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2"><Link2 className="w-4 h-4 text-violet-400" /> Assistente de produto (cole o link)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://shopee.com.br/... ou amazon.com.br/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLinkSearch() } }}
                />
                <Button variant="outline" className="border-slate-700 text-slate-300 shrink-0" onClick={handleLinkSearch} disabled={linkBusy}>
                  {linkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500">Extrai nome, fotos, preço e avaliações. Se o site bloquear, cole manualmente abaixo.</p>
            </div>

            <Input
              placeholder="Ex: Camisola de gola de pele de luxo"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />

            <div className="space-y-2">
              <Label className="text-slate-300">
                <span className="text-red-400">*</span> Imagens do produto
              </Label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {images.map((url, i) => (
                  <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 group">
                    <img src={url} alt={`produto ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {images.length < 10 && (
                  <button
                    className="aspect-square rounded-lg border-2 border-dashed border-slate-700 hover:border-violet-500/60 text-slate-500 hover:text-violet-400 flex flex-col items-center justify-center gap-1 transition-colors"
                    onClick={() => document.getElementById('ugc-upload')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <span className="text-[10px]">+</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">{images.length}/10 imagens · max 10MB cada</p>
              <input type="file" accept="image/*" multiple className="hidden" id="ugc-upload" onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Vendendo Pontos</Label>
              <Textarea
                placeholder={"Um por linha.\nEx:\nTecido macio e quente\nAcabamento premium\nEntrega rapida"}
                value={sellingPoints}
                onChange={(e) => setSellingPoints(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-24"
              />
              <p className="text-xs text-slate-500">Se deixado em branco, o IA analisará e gerará automaticamente os pontos de venda do produto.</p>
              <Button
                variant="outline"
                size="sm"
                className="border-violet-500/50 text-violet-300 hover:bg-violet-500/10"
                onClick={handleScriptGen}
                disabled={scriptBusy || !productName.trim()}
              >
                {scriptBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Gerar roteiro viral (hook + dor + benefícios + CTA)
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Modelo do anúncio</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(LOOKS) as LookId[]).map((k) => {
                  const l = LOOKS[k]
                  const active = look === k
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setLook(k)}
                      className={`rounded-lg border p-3 text-left transition-all ${active ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/40' : 'border-slate-700 hover:bg-slate-800'}`}
                    >
                      <span className={`block text-sm font-semibold ${active ? 'text-violet-300' : 'text-white'}`}>{l.label}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{l.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">
              <span className="text-red-400">*</span> Proporção de vídeo
            </CardTitle>
            <CardDescription>Escolha o formato do anúncio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {UGC_RATIOS.map((r) => (
                <Button
                  key={r.id}
                  type="button"
                  variant={selectedRatio === r.id ? 'default' : 'outline'}
                  className={`h-auto py-3 flex-col items-center ${selectedRatio === r.id ? 'bg-violet-500 hover:bg-violet-600 text-white' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                  onClick={() => setSelectedRatio(r.id)}
                >
                  <span className={`text-xs ${selectedRatio === r.id ? 'text-white' : 'text-slate-500'}`}>{r.label}</span>
                  <span className="text-sm font-bold mt-1">{r.sub}</span>
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Voz da narracao</Label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full rounded-md bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {PT_BR_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">Editar prompt {result && null}</Label>
              <Textarea
                placeholder="Prompt da cena UGC (opcional)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-32"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">O prompt controla a cena gerada para cada take</p>
                <Button variant="ghost" size="sm" className="text-xs text-violet-400 hover:text-violet-300" onClick={syncPrompt} title="Recriar prompt padrão">
                  <RefreshCw className="w-3 h-3 mr-1" /> recriar padrão
                </Button>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold h-12"
              onClick={handleGenerate}
              disabled={loading || uploading || !hasCredits(4) || !productName.trim() || images.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando vídeo UGC...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar {unlimited ? '(Ilimitado)' : '(4 creditos)'}
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 text-center">3 takes AIDA (Hook/Valor/CTA) montados em um vídeo vertical</p>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className="bg-slate-900/50 border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-emerald-400" /> Vídeo gerado
            </CardTitle>
            <CardDescription>{result.prompt}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-6 items-center">
            <div className={`rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 ${selectedRatio === '16:9' ? 'w-[420px]' : 'w-[280px]'}`}>
              <video src={result.videoUrl} controls autoPlay loop playsInline className="w-full h-auto object-contain" />
            </div>
            <div className="space-y-3 flex-1">
              <div className="rounded-lg bg-slate-800 p-3 border border-slate-700">
                <p className="text-xs font-semibold text-violet-400 mb-1">Pontos de venda</p>
                {(result.sellingPoints || []).map((s: string, i: number) => (
                  <p key={i} className="text-xs text-slate-300 mt-1 flex items-start gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> {s}
                  </p>
                ))}
              </div>
              <div className="rounded-lg bg-slate-800 p-3 border border-slate-700">
                <p className="text-xs font-semibold text-fuchsia-400">Scripts AIDA</p>
                {(result.scripts || []).map((s: string, i: number) => (
                  <p key={i} className="text-xs text-slate-300 mt-1">
                    <span className="text-slate-500">{['Hook', 'Valor', 'CTA'][i]}:</span> {s}
                  </p>
                ))}
              </div>
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={() => download(result.videoUrl)}>
                <Download className="w-4 h-4 mr-2" /> Baixar vídeo
              </Button>
              <Button
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={handleSrt}
                disabled={srtBusy}
              >
                {srtBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Captions className="w-4 h-4 mr-2" />}
                Baixar legendas (.srt)
              </Button>
              {result.narrationApplied && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Narração aplicada no vídeo ({result.scripts?.length || 0} takes, voz {result.voice || 'pt-BR'})
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-400" /> Histórico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700 aspect-[9/16] relative group">
                  {h.result_url ? (
                    <video src={h.result_url} muted loop playsInline preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-slate-600" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <span className="text-xs text-white line-clamp-1">{h.product_name || 'Produto'}</span>
                    {h.result_url && (
                      <Button size="sm" className="mt-1 bg-violet-500 h-7 text-xs" onClick={() => download(h.result_url)}>
                        <Download className="w-3 h-3 mr-1" /> Baixar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}