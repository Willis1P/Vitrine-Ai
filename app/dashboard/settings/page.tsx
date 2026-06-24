"use client"

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Settings,
  User,
  Mail,
  Lock,
  Loader2,
  Save,
  Key,
} from 'lucide-react'

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleUpdateProfile = async () => {
    if (!user) return
    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: "Perfil atualizado!",
        description: "Suas informacoes foram salvas"
      })
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas nao coincidem",
        variant: "destructive"
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setNewPassword('')
      setConfirmPassword('')
      setCurrentPassword('')

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso"
      })
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          Configuracoes
        </h1>
        <p className="text-slate-400 mt-1">Gerencie sua conta e preferencias</p>
      </div>

      {/* Profile Section */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            Informacoes Pessoais
          </CardTitle>
          <CardDescription>Atualize suas informacoes de perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Nome completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                value={user?.email || ''}
                disabled
                className="pl-10 bg-slate-800 border-slate-700 text-slate-400"
              />
            </div>
            <p className="text-xs text-slate-500">O email nao pode ser alterado</p>
          </div>
          <Button
            onClick={handleUpdateProfile}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar alteracoes
          </Button>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>Mantenha sua conta segura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Nova senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
                placeholder="Minimo 6 caracteres"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Confirmar nova senha</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
                placeholder="Repita a senha"
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={loading || !newPassword}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
            Alterar senha
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Informacoes da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Membro desde</span>
            <span className="text-white">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tipo de conta</span>
            <span className="text-white capitalize">{profile?.role || 'user'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
