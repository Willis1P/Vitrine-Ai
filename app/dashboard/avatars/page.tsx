"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { PT_BR_VOICES } from '@/lib/ugc-shared'
import { Users, Upload, Loader2, Trash2, Mic2, Sparkles, Play } from 'lucide-react'

export default function AvatarsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [voice, setVoice] = useState('pt-BR-FranciscaNeural')
  const [facePreview, setFacePreview] = useState<string | null>(null)
  const [faceUrl, setFaceUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatars, setAvatars] = useState<any[]>([])
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testVideo, setTestVideo] = useState<string | null>(null)

  useEffect(() => {
    if (user) fetchAvatars()
  }, [user])

  const fetchAvatars = async () => {
    if (!user) return
    const { data } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setAvatars(data)
  }

  const handleFaceFile = async (file: File | undefined) => {
    if (!file || !user) return
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Maximo 10MB", variant: "destructive" })
      return
    }
    const ext = file.name.split('.').pop() || 'jpg'
    const fpath = `avatars/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    setUploading(true)
    try {
      const { error } = await supabase.storage.from('vittrine-images').upload(fpath, file, { cacheControl: '3600', upsert: false })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from('vittrine-images').getPublicUrl(fpath)
      setFaceUrl(data.publicUrl)
      setFacePreview(data.publicUrl)
      toast({ title: "Foto enviada!", description: "Rosto do avatar carregado" })
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleCreate = async () => {
    if (!user) return
    if (!name.trim()) { toast({ title: "Nome obrigatorio", description: "Dê um nome ao avatar", variant: "destructive" }); return }
    if (!faceUrl) { toast({ title: "Foto obrigatoria", description: "Envie uma foto do rosto", variant: "destructive" }); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('avatars').insert({
        user_id: user.id,
        name: name.trim(),
        voice,
        face_image_url: faceUrl,
      })
      if (error) throw new Error(error.message)
      toast({ title: "Avatar criado!", description: "Disponivel para os videos UGC" })
      setName('')
      setFacePreview(null)
      setFaceUrl('')
      fetchAvatars()
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleTestSpeech = async (avatar: any) => {
    setTestingId(avatar.id)
    setTestVideo(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch('/api/v1/avatar/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          avatarId: avatar.id,
          line: `Olá! Meu nome é ${avatar.name} e estou pronto para criar vídeos para a sua loja.`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao animar')
      setTestVideo(data.videoUrl)
      toast({ title: "Avatar falando!", description: "Vídeo gerado no lip-sync local" })
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" })
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('avatars').delete().eq('id', id)
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" })
      return
    }
    setAvatars((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Avatares</h1>
          <p className="text-slate-400 mt-1">Registre seu rosto e voz para videos que falam como o Pippit</p>
        </div>
      </div>

      <div className="rounded-lg bg-sky-500/10 border border-sky-500/30 p-3 text-sm text-sky-300 flex items-start gap-2">
        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Novidade:</strong> os videos UGC agora recebem narração automática do script (voz da sua escolha).
          O lip-sync (boca sincronizada com o áudio) está pronto na infraestrutura local e será ativado em breve usando estes avatares.
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Criar avatar</CardTitle>
            <CardDescription>Envie uma foto do rosto bem iluminada (frontal) e escolha a voz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300">Foto do rosto</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                  {facePreview ? (
                    <img src={facePreview} alt="rosto" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-slate-600" />
                  )}
                </div>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-700 text-slate-300"
                    onClick={() => document.getElementById('face-upload')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    {facePreview ? 'Trocar foto' : 'Enviar foto'}
                  </Button>
                  <p className="text-xs text-slate-500">JPG/PNG, max 10MB</p>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="face-upload"
                onChange={(e) => { handleFaceFile(e.target.files?.[0]); e.target.value = '' }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Nome do avatar</Label>
              <Input
                placeholder="Ex: Larissa, a influencer da marca"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-pink-400" /> Voz (narracao)
              </Label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full rounded-md bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {PT_BR_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>

            <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 h-11 font-semibold" onClick={handleCreate} disabled={saving || uploading}>
              {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
              Criar avatar
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Seus avatares</CardTitle>
            <CardDescription>{avatars.length > 0 ? `${avatars.length} avatar(s) registrado(s)` : 'Nenhum avatar ainda'}</CardDescription>
          </CardHeader>
          <CardContent>
            {avatars.length ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                {avatars.map((a) => (
                  <div key={a.id} className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700 group relative">
                    <div className="aspect-[3/4] bg-slate-700">
                      <img src={a.face_image_url} alt={a.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{a.voice}</p>
                    </div>
                    <button
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      className="absolute bottom-2 right-2 p-1.5 rounded-md bg-pink-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleTestSpeech(a)}
                      disabled={testingId === a.id}
                      title="Testar fala (lip-sync)"
                    >
                      {testingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
                </div>
                {testVideo && (
                  <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700 max-w-xs mx-auto">
                    <video src={testVideo} controls autoPlay loop playsInline className="w-full h-auto object-contain" />
                    <p className="text-xs text-center text-slate-400 py-2">Avatar falando (lip-sync local)</p>
                  </div>
                )}
              </>
            ) : (
              <div className="aspect-video rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center">
                <p className="text-slate-400 text-sm">Registre seu primeiro avatar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}