"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Loader2,
  Settings,
  FileText,
} from 'lucide-react'

export default function AdminPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalContent: 0,
    activeSubscriptions: 0,
    recentUsers: [] as any[],
    recentPayments: [] as any[],
  })

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    if (user && profile?.role === 'admin') {
      fetchStats()
    }
  }, [user, profile])

  const fetchStats = async () => {
    try {
      const [usersRes, paymentsRes, contentRes, subscriptionsRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('payments').select('id, amount, status, created_at, user:profiles(full_name)').order('created_at', { ascending: false }).limit(10),
        supabase.from('generated_content').select('id, type, status'),
        supabase.from('user_subscriptions').select('id, status'),
      ])

      const totalRevenue = (paymentsRes.data || [])
        .filter((p: any) => p.status === 'paid')
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0)

      setStats({
        totalUsers: usersRes.data?.length || 0,
        totalRevenue,
        totalContent: contentRes.data?.length || 0,
        activeSubscriptions: subscriptionsRes.data?.filter((s: any) => s.status === 'active').length || 0,
        recentUsers: usersRes.data || [],
        recentPayments: paymentsRes.data || [],
      })
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Usuarios Total',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-emerald-500 to-teal-500',
      change: '+12%',
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: 'from-yellow-500 to-amber-500',
      change: '+25%',
    },
    {
      title: 'Conteudo Gerado',
      value: stats.totalContent,
      icon: ShoppingCart,
      color: 'from-cyan-500 to-blue-500',
      change: '+8%',
    },
    {
      title: 'Assinaturas Ativas',
      value: stats.activeSubscriptions,
      icon: CreditCard,
      color: 'from-violet-500 to-purple-500',
      change: '+15%',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            Painel Admin
          </h1>
          <p className="text-slate-400 mt-1">Gerencie usuarios, planos e faturamento</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      {stat.change}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="users" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <Users className="w-4 h-4 mr-2" /> Usuarios
              </TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <CreditCard className="w-4 h-4 mr-2" /> Pagamentos
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <ShoppingCart className="w-4 h-4 mr-2" /> Conteudo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Usuarios Recentes</CardTitle>
                  <CardDescription>Ultimos usuarios cadastrados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentUsers.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                        <div>
                          <p className="font-medium text-white">{u.full_name || 'Sem nome'}</p>
                          <p className="text-sm text-slate-400">{u.email}</p>
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(u.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Pagamentos Recentes</CardTitle>
                  <CardDescription>Historico de transacoes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.recentPayments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                        <div>
                          <p className="font-medium text-white">
                            R$ {Number(p.amount).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-sm text-slate-400">{p.user?.full_name || 'Usuario'}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={
                            p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                          }>
                            {p.status}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(p.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Conteudo Gerado</CardTitle>
                  <CardDescription>Estatisticas de geracao de conteudo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Historico detalhado em breve</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
