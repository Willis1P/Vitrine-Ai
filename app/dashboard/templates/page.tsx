"use client"

import { useState, useEffect } from 'react'
import { supabase, Template, TemplateCategory } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Layout,
  Search,
  ImageIcon,
  Video,
  FileText,
  Crown,
  Sparkles,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, any> = {
  'sparkles': Sparkles,
  'shirt': Sparkles,
  'smartphone': Sparkles,
  'home': Sparkles,
  'heart': Sparkles,
  'paw-print': Sparkles,
  'baby': Sparkles,
  'dumbbell': Sparkles,
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [templatesRes, categoriesRes] = await Promise.all([
        supabase.from('templates').select('*, category:template_categories(*)').eq('is_active', true).order('usage_count', { ascending: false }),
        supabase.from('template_categories').select('*').eq('is_active', true).order('sort_order')
      ])

      if (templatesRes.data) setTemplates(templatesRes.data as any[])
      if (categoriesRes.data) setCategories(categoriesRes.data)
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || (template as any).category?.slug === selectedCategory
    const matchesType = selectedType === 'all' || template.type === selectedType
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    return matchesCategory && matchesType && matchesSearch
  })

  const typeIcons = {
    image: ImageIcon,
    video: Video,
    copywriting: FileText,
  }

  const typeColors = {
    image: 'from-emerald-500 to-teal-500',
    video: 'from-violet-500 to-purple-500',
    copywriting: 'from-orange-500 to-red-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
            <Layout className="w-5 h-5 text-white" />
          </div>
          Biblioteca de Templates
        </h1>
        <p className="text-slate-400 mt-1">Templates prontos para usar em seus produtos</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="bg-slate-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-700">Todos</TabsTrigger>
            <TabsTrigger value="image" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <ImageIcon className="w-4 h-4 mr-1" /> Imagens
            </TabsTrigger>
            <TabsTrigger value="video" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
              <Video className="w-4 h-4 mr-1" /> Videos
            </TabsTrigger>
            <TabsTrigger value="copywriting" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
              <FileText className="w-4 h-4 mr-1" /> Copy
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className={selectedCategory === 'all' ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-slate-700 text-slate-300'}
          onClick={() => setSelectedCategory('all')}
        >
          Todos
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.slug ? 'default' : 'outline'}
            className={selectedCategory === category.slug ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-slate-700 text-slate-300'}
            onClick={() => setSelectedCategory(category.slug)}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Layout className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhum template encontrado</p>
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const TypeIcon = typeIcons[template.type]
              const colorClass = typeColors[template.type]

              return (
                <Card key={template.id} className="group bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all overflow-hidden cursor-pointer">
                  <div className="aspect-video relative overflow-hidden">
                    {template.thumbnail_url ? (
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                        <TypeIcon className="w-12 h-12 text-white/40" />
                      </div>
                    )}
                    {template.is_premium && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-amber-500/90 text-amber-900">
                          <Crown className="w-3 h-3 mr-1" /> Premium
                        </Badge>
                      </div>
                    )}
                    <Badge className="absolute bottom-2 left-2 bg-black/60 text-white text-xs">
                      {(template as any).category?.name || 'Geral'}
                    </Badge>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-white text-sm truncate">{template.name}</p>
                    <p className="text-xs text-slate-400 truncate">{template.description}</p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Seed Templates */}
      {templates.length === 0 && !loading && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-8 text-center">
            <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">Templates em breve!</p>
            <p className="text-slate-500 text-sm">Estamos preparando uma biblioteca completa de templates para você.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
