"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { supabase, GeneratedContent, CreditTransaction } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ImageIcon,
  Video,
  User,
  FileText,
  Zap,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react'

interface Stats {
  totalImages: number
  totalVideos: number
  totalModels: number
  totalCopy: number
  recentContent: GeneratedContent[]
  recentTransactions: CreditTransaction[]
}

export default function DashboardPage() {
  const { user, profile, credits } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    if (!user) return

    try {
      const [contentResult, transactionsResult] = await Promise.all([
        supabase
          .from('generated_content')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('credit_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const content = contentResult.data || []
      const transactions = transactionsResult.data || []

      setStats({
        totalImages: content.filter(c => c.type === 'image').length,
        totalVideos: content.filter(c => c.type === 'video').length,
        totalModels: content.filter(c => c.type === 'model').length,
        totalCopy: content.filter(c => c.type === 'copywriting').length,
        recentContent: content,
        recentTransactions: transactions,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      icon: ImageIcon,
      title: 'Gerar Imagem',
      description: 'Fotos profissionais para seu produto',
      href: '/dashboard/images',
      gradient: 'from-emerald-500 to-teal-500',
      credits: 1,
    },
    {
      icon: User,
      title: 'Modelo Virtual',
      description: 'Aplique em modelos virtuais',
      href: '/dashboard/models',
      gradient: 'from-cyan-500 to-blue-500',
      credits: 3,
    },
    {
      icon: Video,
      title: 'Gerar Video',
      description: 'Videos para TikTok e Reels',
      href: '/dashboard/videos',
      gradient: 'from-violet-500 to-purple-500',
      credits: 5,
    },
    {
      icon: FileText,
      title: 'Copywriting',
      description: 'Titulos e descricoes',
      href: '/dashboard/copywriting',
      gradient: 'from-orange-500 to-red-500',
      credits: 1,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Ola, {profile?.full_name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-slate-400 mt-1">
            Pronto para criar conteudo incrivel hoje?
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <Zap className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-400">Creditos</p>
              <p className="text-xl font-bold text-white">{credits}</p>
            </div>
          </div>
          <Link href="/dashboard/plans">
            <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Adicionar Creditos
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="group bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-300 cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">{action.title}</h3>
                    <p className="text-sm text-slate-400 mb-3">{action.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="border-slate-700 text-slate-300">
                        {action.credits} credito{action.credits > 1 ? 's' : ''}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                    {stats?.totalImages || 0}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white">Imagens Geradas</p>
                <p className="text-xs text-slate-500">Total criado</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Video className="w-5 h-5 text-violet-400" />
                  <Badge variant="outline" className="border-violet-500/30 text-violet-400">
                    {stats?.totalVideos || 0}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white">Videos Gerados</p>
                <p className="text-xs text-slate-500">Total criado</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                    {stats?.totalModels || 0}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white">Modelos Virtuais</p>
                <p className="text-xs text-slate-500">Total criado</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-5 h-5 text-orange-400" />
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    {stats?.totalCopy || 0}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white">Copywriting</p>
                <p className="text-xs text-slate-500">Total criado</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Content & Activity */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Content */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Conteudo Recente</CardTitle>
                <CardDescription>Suas ultimas criacoes</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recentContent.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <ImageIcon className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400">Nenhum conteudo criado ainda</p>
                    <Link href="/dashboard/images">
                      <Button variant="link" className="text-emerald-400 mt-2">
                        Criar primeiro conteudo
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats?.recentContent.slice(0, 5).map((content) => (
                      <div
                        key={content.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          content.type === 'image' ? 'bg-emerald-500/10' :
                          content.type === 'video' ? 'bg-violet-500/10' :
                          content.type === 'model' ? 'bg-cyan-500/10' :
                          'bg-orange-500/10'
                        }`}>
                          {content.type === 'image' && <ImageIcon className="w-5 h-5 text-emerald-400" />}
                          {content.type === 'video' && <Video className="w-5 h-5 text-violet-400" />}
                          {content.type === 'model' && <User className="w-5 h-5 text-cyan-400" />}
                          {content.type === 'copywriting' && <FileText className="w-5 h-5 text-orange-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {content.product_name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(content.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {content.status === 'completed' && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        )}
                        {content.status === 'processing' && (
                          <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                        )}
                        {content.status === 'failed' && (
                          <Badge variant="destructive" className="text-xs">Falhou</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credit Activity */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Atividade de Creditos</CardTitle>
                <CardDescription>Historico de uso</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400">Sem atividade de creditos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats?.recentTransactions.slice(0, 5).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}>
                          <Zap className={`w-5 h-5 ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {tx.description || tx.type}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className={`font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trending Products CTA */}
          <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Descubra Produtos em Alta</h3>
                    <p className="text-sm text-slate-400">
                      Veja as tendencias do momento nos principais marketplaces
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/trending">
                  <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
                    Ver Trending
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
