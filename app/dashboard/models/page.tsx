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
  User,
  Sparkles,
  Loader2,
  Download,
  Zap,
  Check,
  Users,
  PersonStanding,
} from 'lucide-react'

const MODEL_TYPES = [
  { id: 'woman', label: 'Mulher', icon: '👩' },
  { id: 'man', label: 'Homem', icon: '👨' },
  { id: 'young', label: 'Jovem', icon: '🧑' },
  { id: 'executive', label: 'Executivo', icon: '👔' },
  { id: 'influencer', label: 'Influenciador', icon: '📸' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
]

const SKIN_TONES = [
  { id: 'light', label: 'Clara' },
  { id: 'medium', label: 'Media' },
  { id: 'dark', label: 'Escura' },
]

const AGE_RANGES = [
  { id: '18-25', label: '18-25 anos' },
  { id: '26-35', label: '26-35 anos' },
  { id: '36-45', label: '36-45 anos' },
  { id: '46-55', label: '46-55 anos' },
  { id: '55+', label: '55+ anos' },
]

const BACKGROUNDS = [
  { id: 'studio', label: 'Estudio Profissional' },
  { id: 'outdoor', label: 'Ao Ar Livre' },
  { id: 'urban', label: 'Urbano' },
  { id: 'home', label: 'Ambiente Domestico' },
  { id: 'beach', label: 'Praia' },
  { id: 'minimal', label: 'Minimalista' },
]

export default function ModelsPage() {
  const { user, credits } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [selectedModelType, setSelectedModelType] = useState('woman')
  const [selectedSkinTone, setSelectedSkinTone] = useState('medium')
  const [selectedAgeRange, setSelectedAgeRange] = useState('26-35')
  const [selectedBackground, setSelectedBackground] = useState('studio')
  const [generatedModels, setGeneratedModels] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  const fetchHistory = async () => {
    if (!user) return
    const { data } = await supabase
      .from('generated_content')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'model')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistory(data)
  }

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Voce precisa estar logado", variant: "destructive" })
      return
    }

    if (credits < 3) {
      toast({ title: "Creditos insuficientes", description: "Modelos virtuais custam 3 creditos", variant: "destructive" })
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
          type: 'model',
          product_name: productName,
          prompt_used: productDescription || productName,
          credits_used: 3,
          status: 'processing',
          result_data: {
            model_type: selectedModelType,
            skin_tone: selectedSkinTone,
            age_range: selectedAgeRange,
            background: selectedBackground
          }
        })
        .select()
        .single()

      if (contentError) throw contentError

      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: 3,
        type: 'usage',
        description: `Modelo virtual: ${productName || 'Produto'}`,
        reference_type: 'model',
        reference_id: content.id
      })

      await new Promise(resolve => setTimeout(resolve, 3000))

      const modelUrls = [
        `https://picsum.photos/seed/model1${Date.now()}/1024/1024`,
        `https://picsum.photos/seed/model2${Date.now()}/1024/1024`,
        `https://picsum.photos/seed/model3${Date.now()}/1024/1024`,
        `https://picsum.photos/seed/model4${Date.now()}/1024/1024`,
      ]

      const models = modelUrls.map((url, i) => ({
        id: `${content.id}-${i}`,
        url,
        modelType: selectedModelType,
        created_at: new Date().toISOString()
      }))

      await supabase
        .from('generated_content')
        .update({ status: 'completed', result_url: models[0].url, result_data: { ...content.result_data, models } })
        .eq('id', content.id)

      setGeneratedModels(models)
      fetchHistory()

      toast({ title: "Modelos gerados!", description: `${models.length} variacoes criadas` })
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (url: string, index: number) => {
    const response = await fetch(url)
    const blob = await response.blob()
    const dlUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = dlUrl
    a.download = `modelo-${productName || 'produto'}-${index + 1}.jpg`
    a.click()
    window.URL.revokeObjectURL(dlUrl)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            Modelos Virtuais
          </h1>
          <p className="text-slate-400 mt-1">Aplique seu produto em modelos virtuais</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
          <Zap className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-semibold">{credits}</span>
          <span className="text-slate-400 text-sm">creditos</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Configurar Modelo</CardTitle>
            <CardDescription>Personalize o modelo virtual para seu produto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome do Produto</Label>
                <Input
                  placeholder="Ex: Vestido Floral"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Descricao do Produto</Label>
                <Textarea
                  placeholder="Descreva o produto, cor, tamanho, estilo..."
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-20"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-slate-300">Tipo de Modelo</Label>
              <div className="grid grid-cols-3 gap-2">
                {MODEL_TYPES.map((model) => (
                  <Button
                    key={model.id}
                    type="button"
                    variant={selectedModelType === model.id ? 'default' : 'outline'}
                    className={`h-auto py-3 flex-col ${selectedModelType === model.id ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-slate-700 text-slate-300'}`}
                    onClick={() => setSelectedModelType(model.id)}
                  >
                    <span className="text-lg mb-1">{model.icon}</span>
                    <span className="text-xs">{model.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Tom de Pele</Label>
                <Select value={selectedSkinTone} onValueChange={setSelectedSkinTone}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {SKIN_TONES.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-white">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Faixa Etaria</Label>
                <Select value={selectedAgeRange} onValueChange={setSelectedAgeRange}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {AGE_RANGES.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="text-white">{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Cenario</Label>
              <Select value={selectedBackground} onValueChange={setSelectedBackground}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {BACKGROUNDS.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-white">{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold h-12"
              onClick={handleGenerate}
              disabled={loading || credits < 3}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando modelos...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Modelos (3 creditos)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Modelos Gerados</CardTitle>
            <CardDescription>{generatedModels.length > 0 ? `${generatedModels.length} variacoes` : 'Resultado aparecera aqui'}</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedModels.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {generatedModels.map((model, i) => (
                  <div key={model.id} className="group relative">
                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-800">
                      <img src={model.url} alt={`Model ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                      <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600" onClick={() => handleDownload(model.url, i)}>
                        <Download className="w-4 h-4 mr-1" /> Baixar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <PersonStanding className="w-12 h-12 text-slate-600 mx-auto mb-3" />
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
