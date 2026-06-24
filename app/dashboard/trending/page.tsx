"use client"

import { useState, useEffect } from 'react'
import { supabase, TrendingProduct } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  Search,
  Flame,
  ArrowUpRight,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'

const MARKETPLACES = [
  { id: 'all', label: 'Todos', icon: ShoppingCart },
  { id: 'shopee', label: 'Shopee', icon: ShoppingCart },
  { id: 'mercadolivre', label: 'Mercado Livre', icon: ShoppingCart },
  { id: 'amazon', label: 'Amazon', icon: ShoppingCart },
  { id: 'tiktok', label: 'TikTok Shop', icon: ShoppingCart },
]

export default function TrendingPage() {
  const [products, setProducts] = useState<TrendingProduct[]>([])
  const [selectedMarketplace, setSelectedMarketplace] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrending()
  }, [selectedMarketplace])

  const fetchTrending = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('trending_products')
        .select('*')
        .eq('is_active', true)
        .order('trend_score', { ascending: false })
        .limit(50)

      if (selectedMarketplace !== 'all') {
        query = query.eq('marketplace', selectedMarketplace)
      }

      const { data } = await query
      if (data) setProducts(data)
    } catch (error) {
      console.error('Error fetching trending:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((p) =>
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  const marketplaceColors: Record<string, string> = {
    shopee: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    mercadolivre: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    amazon: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    tiktok: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    magalu: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    shein: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          Trending Products
        </h1>
        <p className="text-slate-400 mt-1">Descubra produtos em alta e nichos em crescimento</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar produtos ou nichos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <Tabs value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
          <TabsList className="bg-slate-800">
            {MARKETPLACES.map((m) => (
              <TabsTrigger key={m.id} value={m.id} className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Trending Cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-12 text-center">
            <Flame className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Nenhum produto em tendencia no momento</p>
            <p className="text-slate-500 text-sm mt-1">Dados de trending sao atualizados diariamente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product, index) => (
            <Card key={product.id} className="group bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all overflow-hidden">
              <div className="aspect-video relative overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.product_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-slate-600" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-yellow-500/90 text-yellow-900 font-bold">
                    #{index + 1}
                  </Badge>
                </div>
                {product.growth_rate && product.growth_rate > 50 && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-emerald-500/90 text-emerald-900">
                      <Flame className="w-3 h-3 mr-1" /> Em alta
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium text-white text-sm line-clamp-2">{product.product_name}</h3>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`${marketplaceColors[product.marketplace] || 'border-slate-700 text-slate-300'}`}>
                    {product.marketplace}
                  </Badge>
                  {product.growth_rate && (
                    <div className="flex items-center gap-1 text-emerald-400 text-sm">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>{product.growth_rate}%</span>
                    </div>
                  )}
                </div>
                {product.category && (
                  <p className="text-slate-500 text-xs mt-2">{product.category}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Coming Soon Section */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Dados de Trending em Tempo Real</h3>
              <p className="text-sm text-slate-400">
                Em breve: integracao com APIs reais dos marketplaces para dados atualizados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
