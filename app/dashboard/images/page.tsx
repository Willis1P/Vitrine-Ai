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
  ImageIcon,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Loader2,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  X,
  ShoppingCart,
  Zap,
} from 'lucide-react'

const IMAGE_STYLES = [
  { id: 'professional', label: 'Foto Profissional', description: 'Iluminação profissional, fundo neutro' },
  { id: 'white-bg', label: 'Fundo Branco', description: 'Perfeito para marketplaces' },
  { id: 'lifestyle', label: 'Lifestyle', description: 'Produto em uso no dia a dia' },
  { id: 'banner', label: 'Banner Promocional', description: 'Com destaques de oferta' },
  { id: 'carousel', label: 'Carrossel', description: 'Vários ângulos do produto' },
  { id: 'instagram', label: 'Instagram Post', description: 'Formato 1:1 otimizado' },
  { id: 'story', label: 'Instagram Story', description: 'Formato 9:16 vertical' },
  { id: 'tiktok', label: 'TikTok Shop', description: 'Formato nativo TikTok' },
]

const MARKETPLACES = [
  { id: 'shopee', label: 'Shopee' },
  { id: 'mercadolivre', label: 'Mercado Livre' },
  { id: 'amazon', label: 'Amazon' },
  { id: 'tiktok', label: 'TikTok Shop' },
  { id: 'magalu', label: 'Magazine Luiza' },
  { id: 'shein', label: 'Shein' },
]

const CATEGORIES = [
  { id: 'moda-feminina', label: 'Moda Feminina' },
  { id: 'moda-masculina', label: 'Moda Masculina' },
  { id: 'eletronicos', label: 'Eletrônicos' },
  { id: 'casa-decoracao', label: 'Casa e Decoração' },
  { id: 'beleza', label: 'Beleza' },
  { id: 'pet', label: 'Pet' },
  { id: 'infantil', label: 'Infantil' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'acessorios', label: 'Acessórios' },
  { id: 'alimentos', label: 'Alimentos' },
]

const IMAGE_FORMATS = [
  { id: '1:1', label: 'Quadrado (1:1)', width: 1024, height: 1024 },
  { id: '4:5', label: 'Retrato (4:5)', width: 1024, height: 1280 },
  { id: '16:9', label: 'Paisagem (16:9)', width: 1920, height: 1080 },
  { id: '9:16', label: 'Vertical (9:16)', width: 1080, height: 1920 },
]

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  style: string
  created_at: string
}

export default function ImagesPage() {
  const { user, credits, unlimited, hasCredits, refreshCredits } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [productName, setProductName] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('professional')
  const [selectedMarketplace, setSelectedMarketplace] = useState('shopee')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('1:1')
  const [inputMethod, setInputMethod] = useState<'upload' | 'url' | 'describe'>('describe')
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchHistory()
    }
  }, [user])

  const fetchHistory = async () => {
    if (!user) return

    const { data } = await supabase
      .from('generated_content')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'image')
      .order('created_at', { ascending: false })
      .limit(20)

    if (data) {
      setHistory(data)
    }
  }

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Maximo 10MB", variant: "destructive" })
      return
    }
    setUploadedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    // auto-sugere nome se vazio
    if (!productName) {
      const nameFromFile = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setProductName(nameFromFile.slice(0, 80))
    }
  }

  const uploadImageToStorage = async (): Promise<string | null> => {
    if (!uploadedFile || !user) return null
    setIsUploading(true)
    try {
      const ext = uploadedFile.name.split('.').pop() || 'jpg'
      const path = `uploads/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('vittrine-images').upload(path, uploadedFile, {
        cacheControl: '3600',
        upsert: false,
      })
      if (error) throw error
      const { data } = supabase.storage.from('vittrine-images').getPublicUrl(path)
      return data.publicUrl
    } catch (err: any) {
      console.error('upload error', err)
      toast({ title: "Erro no upload", description: err.message || "Falha ao enviar foto", variant: "destructive" })
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerate = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Voce precisa estar logado",
        variant: "destructive"
      })
      return
    }

    if (!hasCredits(1)) {
      toast({
        title: "Creditos insuficientes",
        description: "Voce precisa de pelo menos 1 credito para gerar imagens",
        variant: "destructive"
      })
      return
    }

    // Validação por método: describe precisa nome/desc, url precisa URL, upload precisa foto
    if (inputMethod === 'describe' && !productName && !productDescription) {
      toast({
        title: "Campo obrigatorio",
        description: "Por favor, descreva seu produto",
        variant: "destructive"
      })
      return
    }
    if (inputMethod === 'url' && !productUrl) {
      toast({ title: "URL obrigatoria", description: "Cole a URL do produto", variant: "destructive" })
      return
    }
    if (inputMethod === 'upload' && !uploadedFile) {
      toast({ title: "Foto obrigatoria", description: "Selecione uma foto do produto", variant: "destructive" })
      return
    }
    // url/upload também precisam pelo menos alguma descrição depois; será resolvido no backend via scraping

    setLoading(true)

    try {
      const token = await getAccessToken()

      // Se for upload, envia para Storage antes
      let finalImageUrl = productUrl
      if (inputMethod === 'upload' && uploadedFile) {
        const uploadedUrl = await uploadImageToStorage()
        if (!uploadedUrl) {
          setLoading(false)
          return
        }
        finalImageUrl = uploadedUrl
      }

      const response = await fetch('/api/v1/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productName,
          productDescription,
          productCategory: selectedCategory,
          marketplace: selectedMarketplace,
          style: selectedStyle,
          imageUrl: finalImageUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar imagens')
      }

      setGeneratedImages(data.images || [])
      fetchHistory()
      refreshCredits()

      toast({
        title: "Imagens geradas!",
        description: `${(data.images || []).length} imagens criadas com sucesso`
      })
    } catch (error: any) {
      console.error('Error generating images:', error)
      toast({
        title: "Erro ao gerar imagens",
        description: error.message || "Tente novamente",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteHistory = async (id: string) => {
    if (!confirm('Excluir esta imagem do histórico?')) return
    const prev = history
    setHistory((h) => h.filter((item) => item.id !== id))
    const { error } = await supabase.from('generated_content').delete().eq('id', id)
    if (error) {
      setHistory(prev)
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Excluída", description: "Imagem removida do histórico" })
    }
  }

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${productName || 'produto'}-${index + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: "Erro ao baixar",
        description: "Nao foi possivel baixar a imagem",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            Geracao de Imagens
          </h1>
          <p className="text-slate-400 mt-1">
            Crie imagens profissionais para seus produtos
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
          <Zap className="w-5 h-5 text-emerald-400" />
          {unlimited ? (
            <span className="text-white font-semibold text-cyan-400">Ilimitado</span>
          ) : (
            <>
              <span className="text-white font-semibold">{credits}</span>
              <span className="text-slate-400 text-sm">creditos</span>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Seu Produto</CardTitle>
            <CardDescription>Como voce quer informar seu produto?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={inputMethod} onValueChange={(v) => setInputMethod(v as any)}>
              <TabsList className="bg-slate-800 w-full">
                <TabsTrigger value="describe" className="flex-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                  Descrever
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                  URL do Produto
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                  Enviar Foto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="describe" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Nome do Produto</Label>
                  <Input
                    placeholder="Ex: Vestido Floral Feminino"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Descricao Detalhada</Label>
                  <Textarea
                    placeholder="Descreva seu produto, cores, materiais, estilo..."
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-24"
                  />
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">URL do Produto</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="https://shopee.com.br/produto..."
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Cole a URL do seu produto e nossa IA vai extrair as informacoes
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-slate-600 transition-colors">
                  {previewUrl ? (
                    <div className="space-y-3">
                      <img src={previewUrl} alt="Preview" className="w-40 h-40 object-cover rounded-xl mx-auto border border-slate-600" />
                      <p className="text-sm text-emerald-400 flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" /> {uploadedFile?.name}</p>
                      <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => { setUploadedFile(null); setPreviewUrl(null); }}>
                        <Trash2 className="w-4 h-4 mr-1" /> Remover
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400 mb-2">Arraste uma imagem ou clique para enviar</p>
                      <p className="text-xs text-slate-500">PNG, JPG ate 10MB</p>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" id="image-upload" onChange={handleFileChange} />
                  {!previewUrl && (
                    <Button
                      variant="outline"
                      className="mt-4 border-slate-700 text-slate-300"
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      Selecionar arquivo
                    </Button>
                  )}
                  {previewUrl && (
                    <p className="text-xs text-slate-500 mt-2">A foto será usada como referência para manter a fidelidade do produto</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Options */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Marketplace</Label>
                  <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {MARKETPLACES.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-white hover:bg-slate-700">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Categoria</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-white hover:bg-slate-700">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Formato da Imagem</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {IMAGE_FORMATS.map((format) => (
                    <Button
                      key={format.id}
                      type="button"
                      variant={selectedFormat === format.id ? 'default' : 'outline'}
                      className={selectedFormat === format.id
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'border-slate-700 text-slate-300 hover:bg-slate-800'}
                      onClick={() => setSelectedFormat(format.id)}
                    >
                      {format.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Estilo da Imagem</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {IMAGE_STYLES.map((style) => (
                    <Button
                      key={style.id}
                      type="button"
                      variant={selectedStyle === style.id ? 'default' : 'outline'}
                      className={`h-auto py-2 px-3 flex-col items-start ${
                        selectedStyle === style.id
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                      onClick={() => setSelectedStyle(style.id)}
                    >
                      <span className="text-xs font-medium">{style.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold h-12"
              onClick={handleGenerate}
              disabled={loading || isUploading || !hasCredits(1)}
            >
              {loading || isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {isUploading ? 'Enviando foto...' : 'Gerando imagens...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Imagens {unlimited ? '(Ilimitado)' : '(1 credito)'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Imagens Geradas</CardTitle>
            <CardDescription>
              {generatedImages.length > 0
                ? `${generatedImages.length} imagens criadas`
                : 'As imagens aparecerão aqui'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {generatedImages.map((image, index) => (
                  <div key={image.id} className="group relative">
                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-800">
                      <img
                        src={image.url}
                        alt={`Generated ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => handleDownload(image.url, index)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Baixar
                      </Button>
                    </div>
                    <Badge className="absolute top-2 left-2 bg-slate-900/80 text-xs">
                      {index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Configure seu produto e clique em gerar</p>
                  <p className="text-slate-500 text-sm mt-1">ate 4 variacoes por geracao</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      {history.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Historico</CardTitle>
            <CardDescription>Suas ultimas imagens geradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {history.map((item) => (
                <div key={item.id} className="group relative">
                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                    {item.result_url ? (
                      <img
                        src={item.result_url}
                        alt={item.product_name || 'Generated'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {item.status === 'processing' ? (
                          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                        ) : item.status === 'failed' ? (
                          <X className="w-6 h-6 text-red-400" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                    {item.result_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => handleDownload(item.result_url, 0)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-red-500/30 hover:text-red-300"
                      onClick={() => handleDeleteHistory(item.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
