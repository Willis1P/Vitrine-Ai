"use client"

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  ImageIcon,
  Video,
  User,
  FileText,
  Layout,
  TrendingUp,
  GraduationCap,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  CreditCard,
  Menu,
  X,
} from 'lucide-react'

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: ImageIcon, label: 'Imagens', href: '/dashboard/images' },
  { icon: User, label: 'Modelos Virtuais', href: '/dashboard/models' },
  { icon: Video, label: 'Videos', href: '/dashboard/videos' },
  { icon: FileText, label: 'Copywriting', href: '/dashboard/copywriting' },
  { icon: Layout, label: 'Templates', href: '/dashboard/templates' },
  { icon: TrendingUp, label: 'Trending', href: '/dashboard/trending' },
  { icon: GraduationCap, label: 'Academia', href: '/dashboard/academy' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { user, profile, credits, signOut } = useAuth()

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass border-b border-slate-800 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
            <span className="text-slate-900 font-bold text-sm">V</span>
          </div>
          <span className="font-bold text-white">VitrineAI</span>
        </Link>
        <Avatar className="w-8 h-8">
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback className="bg-slate-800 text-white text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shrink-0">
                <span className="text-slate-900 font-bold">V</span>
              </div>
              {!collapsed && <span className="font-bold text-white">VitrineAI</span>}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Credits */}
          {!collapsed && (
            <div className="mx-3 mb-2 p-3 rounded-lg bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">Creditos</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{credits}</div>
              <Link href="/dashboard/plans">
                <Button size="sm" variant="ghost" className="mt-2 w-full text-xs text-slate-400 hover:text-white">
                  Adicionar creditos
                </Button>
              </Link>
            </div>
          )}

          {/* User Menu */}
          <div className="p-3 border-t border-slate-800">
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-lg bg-slate-800/50`}>
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-slate-700 text-white text-xs">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.full_name || 'Usuario'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <div className="mt-2 space-y-1">
                <Link href="/dashboard/settings">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-slate-400 hover:text-white">
                    <Settings className="w-4 h-4 mr-2" />
                    Configuracoes
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'} pt-16 lg:pt-0`}>
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
