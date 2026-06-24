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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  FileText,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Zap,
  Hash,
  Type,
  List,
  Target,
} from 'lucide-react'

const MARKETPLACES = [
  { id: 'shopee', label: 'Shopee', charLimit: 5000 },
  { id: 'mercadolivre', label: 'Mercado Livre', charLimit: 2000 },
  { id: 'amazon', label: 'Amazon', charLimit: 2000 },
  { id: 'tiktok', label: 'TikTok Shop', charLimit: 2200 },
  { id: 'shein', label: 'Shein', charLimit: 3000 },
]

const CONTENT_TYPES = [
  { id: 'full', label: 'Completo', description: 'Titulo + Descricao + Hashtags' },
  { id: 'title', label: 'Apenas Titulo', description: 'Titulos otimizados para SEO' },
  { id: 'description', label: 'Apenas Descricao', description: 'Descricao persuasiva' },
  { id: 'bullets', label: 'Bullet Points', description: 'Lista de beneficios' },
  { id: 'hashtags', label: 'Hashtags', description: 'Hashtags relevantes' },
]

const TONES = [
  { id: 'professional', label: 'Profissional' },
  { id: 'casual', label: 'Casual' },
  { id: 'luxury', label: 'Luxuoso' },
  { id: 'urgent', label: 'Urgente' },
  { id: 'friendly', label: 'Amigavel' },
]

export default function CopywritingPage() {
  const { user, credits } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [productName, setProductName] = useState('')
  const [productFeatures, setProductFeatures] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [selectedMarketplace, setSelectedMarketplace] = useState('shopee')
  const [selectedType, setSelectedType] = useState('full')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [generatedContent, setGeneratedContent] = useState<any>(null)
  const [copied, setCopied] = useState<string | null>(null)
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
      .eq('type', 'copywriting')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistory(data)
  }

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Voce precisa estar logado", variant: "destructive" })
      return
    }

    if (credits < 1) {
      toast({ title: "Creditos insuficientes", description: "Copywriting custa 1 credito", variant: "destructive" })
      return
    }

    if (!productName) {
      toast({ title: "Campo obrigatorio", description: "Informe o nome do produto", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      const { data: content, error: contentError } = await supabase
        .from('generated_content')
        .insert({
          user_id: user.id,
          type: 'copywriting',
          product_name: productName,
          prompt_used: productFeatures,
          marketplace: selectedMarketplace,
          credits_used: 1,
          status: 'processing',
          result_data: {
            content_type: selectedType,
            tone: selectedTone,
            target_audience: targetAudience
          }
        })
        .select()
        .single()

      if (contentError) throw contentError

      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: 1,
        type: 'usage',
        description: `Copywriting: ${productName}`,
        reference_type: 'copywriting',
        reference_id: content.id
      })

      await new Promise(resolve => setTimeout(resolve, 2500))

      // Generate mock content
      const marketplace = MARKETPLACES.find(m => m.id === selectedMarketplace)
      const generated = {
        title: `${productName} | Qualidade Premium + Frete Gratis | ${marketplace?.label || 'Marketplace'}`,
        description: `DESCUBRA O MELHOR ${productName.toUpperCase()} DO MERCADO!

Por que escolher nosso produto?

Produtos de qualidade excepcional que vao transformar sua experiencia. Feito com materiais premium e acabamento impecavel.

BENEFICIOS:
- Alta durabilidade e resistencia
- Design moderno e exclusivo
- Facil de usar e manter
- Entrega rapida garantida
- Garantia de satisfacao

CARACTERISTICAS:
${productFeatures || 'Produto novo, original e com garantia do fabricante.'}

Nao perca essa oportunidade! Compre agora e aproveite condicoes especiais.

${targetAudience ? `Perfeito para: ${targetAudience}` : ''}

Envio imediato! Aproveite!`,
        bullets: [
          'Qualidade premium garantida',
          'Frete gratis para todo Brasil',
          'Entrega rapida em ate 5 dias',
          'Garantia de 30 dias',
          'Suporte ao cliente 24/7',
          'Produto original e lacrado'
        ],
        hashtags: [
          `#${productName.replace(/\s+/g, '').toLowerCase()}`,
          '#oferta', '#fretegratis', '#qualidadepremium', '#promocao',
          `#${selectedMarketplace}`, '#compraonline', '#melhorpreco'
        ],
        cta: 'CLIQUE EM COMPRAR AGORA!'
      }

      await supabase
        .from('generated_content')
        .update({ status: 'completed', result_data: { ...content.result_data, generated } })
        .eq('id', content.id)

      setGeneratedContent(generated)
      fetchHistory()

      toast({ title: "Conteudo gerado!", description: "Copywriting criado com sucesso" })
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
    toast({ title: "Copiado!", description: "Conteudo copiado para a area de transferencia" })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Copywriting
          </h1>
          <p className="text-slate-400 mt-1">Titulos e descricoes que vendem</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
          <Zap className="w-5 h-5 text-orange-400" />
          <span className="text-white font-semibold">{credits}</span>
          <span className="text-slate-400 text-sm">creditos</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Configurar Copywriting</CardTitle>
            <CardDescription>Conteudo otimizado para conversao</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome do Produto</Label>
                <Input
                  placeholder="Ex: Fone Bluetooth Premium X200"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Caracteristicas do Produto</Label>
                <Textarea
                  placeholder="Liste as principais caracteristicas e beneficios..."
                  value={productFeatures}
                  onChange={(e) => setProductFeatures(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Publico-Alvo (opcional)</Label>
                <Input
                  placeholder="Ex: Jovens fitness, Gamers, Maes..."
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Marketplace</Label>
                <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {MARKETPLACES.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-white">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Tom de Voz</Label>
                <Select value={selectedTone} onValueChange={setSelectedTone}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {TONES.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-white">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Tipo de Conteudo</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONTENT_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    type="button"
                    variant={selectedType === type.id ? 'default' : 'outline'}
                    className={`h-auto py-2 flex-col ${selectedType === type.id ? 'bg-orange-500 hover:bg-orange-600' : 'border-slate-700 text-slate-300'}`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <span className="text-xs">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold h-12"
              onClick={handleGenerate}
              disabled={loading || credits < 1 || !productName}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando conteudo...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Copywriting (1 credito)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Conteudo Gerado</CardTitle>
            <CardDescription>Clique em qualquer secao para copiar</CardDescription>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium text-slate-300">Titulo</span>
                  </div>
                  <div
                    className="p-3 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors"
                    onClick={() => copyToClipboard(generatedContent.title, 'title')}
                  >
                    <p className="text-white">{generatedContent.title}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-medium text-slate-300">Descricao</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white"
                      onClick={() => copyToClipboard(generatedContent.description, 'description')}
                    >
                      {copied === 'description' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 max-h-64 overflow-y-auto">
                    <p className="text-slate-300 whitespace-pre-line text-sm">{generatedContent.description}</p>
                  </div>
                </div>

                {/* Bullets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-medium text-slate-300">Bullet Points</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white"
                      onClick={() => copyToClipboard(generatedContent.bullets.map((b: string) => `- ${b}`).join('\n'), 'bullets')}
                    >
                      {copied === 'bullets' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <ul className="list-disc list-inside text-slate-300 text-sm space-y-1">
                      {generatedContent.bullets.map((bullet: string, i: number) => (
                        <li key={i}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Hashtags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-medium text-slate-300">Hashtags</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white"
                      onClick={() => copyToClipboard(generatedContent.hashtags.join(' '), 'hashtags')}
                    >
                      {copied === 'hashtags' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {generatedContent.hashtags.map((tag: string, i: number) => (
                      <Badge key={i} variant="outline" className="border-slate-700 text-slate-300">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Descreva seu produto e clique em gerar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
