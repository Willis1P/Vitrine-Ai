"use client"
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getUserBalance, getEffectiveMuapiKey } from '@/lib/muapi-studio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { KeyRound, Wallet, Eye, EyeOff, ExternalLink, LogOut, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const STORAGE_KEY = 'muapi_key'

interface StudioShellProps {
  children: React.ReactNode
  title?: string
}

export default function StudioShell({ children, title = 'Studio' }: StudioShellProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [inputKey, setInputKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loadingBalance, setLoadingBalance] = useState(false)

  const fetchBalance = useCallback(async (key: string) => {
    setLoadingBalance(true)
    try {
      const data = await getUserBalance(key)
      // MuAPI returns { balance: number } or { credits: ... }
      const b = data?.balance ?? data?.credits ?? data?.amount ?? null
      setBalance(typeof b === 'number' ? b : null)
    } catch (e: any) {
      // 401/403 will trigger muapi:auth-required elsewhere
      console.warn('balance failed', e?.message)
    } finally {
      setLoadingBalance(false)
    }
  }, [])

  useEffect(() => {
    const stored = getEffectiveMuapiKey()
    if (stored) {
      setApiKey(stored)
      fetchBalance(stored)
    } else {
      // Se tem chave server-side, não precisa BYOK - mostra como conectado via server
      const serverHasKey = typeof window !== 'undefined' && (window as any).__VITRINE_HAS_SERVER_MUAPI__ // optional flag
      // sem chave: abre modal automaticamente apenas se não houver server key e usuário está no studio
      // Verifica via API proxy
      fetch('/api/v1/muapi/status').then(r=>r.json()).then(d=>{
        if (!d.hasServerKey && !stored) setShowModal(true)
        if (d.hasServerKey) setBalance(null)
      }).catch(()=> { if(!stored) setShowModal(true) })
    }
  }, [fetchBalance])

  // Poll balance every 30s
  useEffect(() => {
    if (!apiKey) return
    const id = setInterval(()=> fetchBalance(apiKey), 30000)
    return ()=> clearInterval(id)
  }, [apiKey, fetchBalance])

  // Listen to auth-required global event (from muapi-studio)
  useEffect(() => {
    const handler = (e: any) => {
      toast({ title: 'Chave MuAPI inválida', description: `Status ${e.detail?.status}: verifique sua API key`, variant: 'destructive' })
      setShowModal(true)
    }
    if (typeof window !== 'undefined') window.addEventListener('muapi:auth-required' as any, handler)
    return ()=> { if(typeof window!=='undefined') window.removeEventListener('muapi:auth-required' as any, handler) }
  }, [toast])

  const handleSave = () => {
    const trimmed = inputKey.trim()
    if (!trimmed) {
      toast({ title: 'Chave vazia', variant: 'destructive' })
      return
    }
    localStorage.setItem(STORAGE_KEY, trimmed)
    document.cookie = `muapi_key=${trimmed}; path=/; max-age=31536000; SameSite=Lax`
    setApiKey(trimmed)
    setShowModal(false)
    setInputKey('')
    fetchBalance(trimmed)
    toast({ title: 'Chave salva!', description: 'BYOK configurado. Saldo será atualizado.' })
  }

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY)
    document.cookie = 'muapi_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    setApiKey(null)
    setBalance(null)
    toast({ title: 'Chave removida', description: 'Voltando ao modo gratuito / server key se houver.' })
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Top bar integrado ao AuthProvider */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" /> {title}
                {apiKey ? <Badge className="bg-emerald-500/20 text-emerald-400 border-0 ml-2"><CheckCircle2 className="w-3 h-3 mr-1"/>BYOK ativo</Badge>
                : <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border-0 ml-2"><AlertCircle className="w-3 h-3 mr-1"/>Modo free/server</Badge>}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {user ? `Logado: ${user.email}` : 'Não logado'} • {apiKey ? 'Usando sua chave MuAPI (BYOK)' : 'Usando Pollinations free + MUAPI_API_KEY do servidor se houver'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                <Wallet className="w-4 h-4 text-emerald-400" />
                {loadingBalance ? <Loader2 className="w-4 h-4 animate-spin text-slate-400"/> : <span className="text-sm font-bold text-white">{balance !== null ? `$${balance}` : '—'}</span>}
                <span className="text-xs text-slate-500">saldo</span>
              </div>
              <Button variant="outline" size="sm" onClick={()=> setShowModal(true)} className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700">
                <KeyRound className="w-4 h-4 mr-1"/>{apiKey ? 'Trocar chave' : 'Configurar chave'}
              </Button>
              {apiKey && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="text-slate-400 hover:text-white">
                  <LogOut className="w-4 h-4"/>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {apiKey && (
          <CardContent className="pt-0">
            <p className="text-xs text-slate-500">Chave armazenada em <code className="text-slate-300">localStorage muapi_key</code> e enviada como <code className="text-cyan-300">x-api-key</code>. Remova a qualquer momento. Servidor também usa <code className="text-fuchsia-300">MUAPI_API_KEY</code> do .env.local quando disponível.</p>
          </CardContent>
        )}
      </Card>

      {/* BYOK Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-cyan-400"/>MuAPI - sua chave</DialogTitle>
            <DialogDescription className="text-slate-400">
              Cole sua chave da <a href="https://muapi.ai/access-keys" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-1">muapi.ai <ExternalLink className="w-3 h-3"/></a>. Fica só no seu navegador (BYOK). Sem chave usa fallback gratuito Pollinations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">x-api-key</Label>
              <div className="relative">
                <Input type={showKey ? 'text' : 'password'} value={inputKey} onChange={e=> setInputKey(e.target.value)} placeholder="sk-... ou sua muapi key" className="bg-slate-800 border-slate-700 text-white pr-10"/>
                <button type="button" onClick={()=> setShowKey(!showKey)} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-white">{showKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
              </div>
              <p className="text-xs text-slate-500">Também pode definir <code className="text-slate-300">MUAPI_API_KEY</code> em .env.local para todo servidor. BYOK sobrepõe.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">Salvar chave</Button>
              <Button variant="outline" onClick={()=> setShowModal(false)} className="border-slate-700">Usar free</Button>
            </div>
            <p className="text-xs text-center text-slate-500">Sem chave? <a href="https://muapi.ai/access-keys" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Pegue grátis em muapi.ai</a></p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-[400px]">
        {children}
      </div>
    </div>
  )
}
