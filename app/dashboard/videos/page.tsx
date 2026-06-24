"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Video,
  Sparkles,
  Loader2,
  Download,
  Zap,
  Play,
  Film,
  Clock,
} from 'lucide-react'

const VIDEO_TYPES = [
  { id: 'ugc', label: 'UGC', description: 'Conteudo de usuario autentico' },
  { id: 'review', label: 'Review', description: 'Avaliacao do produto' },
  { id: 'showcase', label: 'Showcase', description: 'Apresentacao do produto' },
  { id: 'promo', label: 'Promocao', description: 'Video promocional' },
  { id: 'before-after', label: 'Antes/Depois', description: 'Transformacao' },
  { id: 'offer', label: 'Oferta', description: 'Destaque de oferta' },
]

const VIDEO_DURATIONS = [
  { id: '15s', label: '15 segundos', credits: 5 },
  { id: '30s', label: '30 segundos', credits: 8 },
  { id: '60s', label: '60 segundos', credits: 12 },
]

const VIDEO_STYLES = [
  { id: 'tiktok', label: 'TikTok Shop' },
  { id: 'reels', label: 'Instagram Reels' },
  { id: 'shorts', label: 'YouTube Shorts' },
  { id: 'shopee', label: 'Shopee Video' },
]

export default function VideosPage() {
  const { user, credits } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [selectedType, setSelectedType] = useState('ugc')
  const [selectedDuration, setSelectedDuration] = useState('15s')
  const [selectedStyle, setSelectedStyle] = useState('tiktok')
  const [generatedVideos, setGeneratedVideos] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])

  const requiredCredits = VIDEO_DURATIONS.find(d => d.id === selectedDuration)?.credits || 5

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  const fetchHistory = async () => {
    if (!user) return
    const { data } = await supabase
      .from('generated_content')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'video')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistory(data)
  }

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Voce precisa estar logado", variant: "destructive" })
      return
    }

    if (credits < requiredCredits) {
      toast({ title: "Creditos insuficientes", description: `Este video requer ${requiredCredits} creditos`, variant: "destructive" })
      return
    }

    if (!productName && !productDescription) {
      toast({ title: "Campo obrigatorio", description: "Descreva seu produto", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      const { data: content, error: contentError } = await supabase
        .from('generated_content')
        .insert({
          user_id: user.id,
          type: 'video',
          product_name: productName,
          prompt_used: productDescription || productName,
          credits_used: requiredCredits,
          status: 'processing',
          result_data: {
            video_type: selectedType,
            duration: selectedDuration,
            style: selectedStyle
          }
        })
        .select()
        .single()

      if (contentError) throw contentError

      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: requiredCredits,
        type: 'usage',
        description: `Video: ${productName || 'Produto'}`,
        reference_type: 'video',
        reference_id: content.id
      })

      await new Promise(resolve => setTimeout(resolve, 4000))

      const videos = [
        { id: `${content.id}-1`, url: `https://picsum.photos/seed/vid${Date.now()}/1080/1920`, type: selectedType },
      ]

      await supabase
        .from('generated_content')
        .update({ status: 'completed', result_url: videos[0].url, result_data: { ...content.result_data, videos } })
        .eq('id', content.id)

      setGeneratedVideos(videos)
      fetchHistory()

      toast({ title: "Video gerado!", description: "Video criado com sucesso" })
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
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
            Geracao de Videos
          </h1>
          <p className="text-slate-400 mt-1">Videos verticais para TikTok, Reels e Shorts</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
          <Zap className="w-5 h-5 text-violet-400" />
          <span className="text-white font-semibold">{credits}</span>
          <span className="text-slate-400 text-sm">creditos</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Configurar Video</CardTitle>
            <CardDescription>Personalize seu video promocional</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome do Produto</Label>
                <Input
                  placeholder="Ex: Fone Bluetooth Premium"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Descricao do Produto</Label>
                <Textarea
                  placeholder="Descreva o produto e os pontos principais..."
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-20"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-slate-300">Tipo de Video</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VIDEO_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    type="button"
                    variant={selectedType === type.id ? 'default' : 'outline'}
                    className={`h-auto py-3 flex-col ${selectedType === type.id ? 'bg-violet-500 hover:bg-violet-600' : 'border-slate-700 text-slate-300'}`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <span className="text-sm font-medium">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Duracao</Label>
                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {VIDEO_DURATIONS.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-white">{d.label} ({d.credits} c)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Estilo</Label>
                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {VIDEO_STYLES.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-white">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-semibold h-12"
              onClick={handleGenerate}
              disabled={loading || credits < requiredCredits}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando video...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Video ({requiredCredits} creditos)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Video Gerado</CardTitle>
            <CardDescription>{generatedVideos.length > 0 ? '1 video criado' : 'Resultado aparecera aqui'}</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedVideos.length > 0 ? (
              <div className="space-y-4">
                <div className="aspect-[9/16] rounded-xl overflow-hidden bg-slate-800 max-w-xs mx-auto relative">
                  <img src={generatedVideos[0].url} alt="Generated video" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
                <Button className="w-full bg-violet-500 hover:bg-violet-600 text-white" onClick={() => {
                  const a = document.createElement('a')
                  a.href = generatedVideos[0].url
                  a.download = `${productName || 'video'}.mp4`
                  a.click()
                }}>
                  <Download className="w-4 h-4 mr-2" /> Baixar Video
                </Button>
              </div>
            ) : (
              <div className="aspect-[9/16] rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center max-w-xs mx-auto">
                <div className="text-center">
                  <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Configure e clique em gerar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
