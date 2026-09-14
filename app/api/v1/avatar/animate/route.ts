import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import ffmpegPath from 'ffmpeg-static'
import { getUserFromRequest } from '@/lib/supabase/server'
import { generateSpeech } from '@/lib/tts'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const execFileAsync = promisify(execFile)

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user || !supabase) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido. Envie JSON com avatarId e line opcional.' }, { status: 400 }) }

  const avatarId = (body.avatarId || '').toString().trim()
  if (!avatarId) return NextResponse.json({ error: 'Informe o avatarId (UUID do avatar).' }, { status: 400 })
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(avatarId)) {
    return NextResponse.json({ error: 'avatarId inválido (UUID esperado).' }, { status: 400 })
  }
  const lineRaw = body.line ? String(body.line).trim().slice(0, 600) : undefined
  if (lineRaw && lineRaw.length < 2) return NextResponse.json({ error: 'Frase muito curta.' }, { status: 400 })

  const { data: avatar } = await supabase
    .from('avatars')
    .select('*')
    .eq('id', avatarId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!avatar) return NextResponse.json({ error: 'Avatar não encontrado' }, { status: 404 })

  const python = process.env.W2LIP_PYTHON || (process.platform === 'win32' ? 'C:\\vitrine\\python310\\python.exe' : 'python3')
  const runPy = process.env.W2LIP_RUN || (process.platform === 'win32' ? 'C:\\vitrine\\w2lip\\proj\\run.py' : path.join(process.cwd(), 'tools', 'wav2lip', 'run.py'))
  const ckpt = process.env.W2LIP_CHECKPOINT || (process.platform === 'win32' ? 'C:\\vitrine\\w2lip\\checkpoints\\wav2lip_gan.pth' : path.join('C:', 'vitrine', 'w2lip', 'checkpoints', 'wav2lip_gan.pth'))

  const runPyStat = await fs.stat(runPy).catch(() => null)
  if (!runPyStat) {
    return NextResponse.json({
      error: 'Pipelines de lip-sync não instalados neste servidor. Rode localmente: powershell -ExecutionPolicy Bypass -File tools/wav2lip/setup.ps1. (Wav2Lip requer Python 3.10 + checkpoint).',
      hint: 'Este recurso funciona apenas em ambiente local Windows com C:\\vitrine\\ instalado. Em produção (Vercel/Netlify) retorna 501.',
    }, { status: 501 })
  }
  const ckptStat = await fs.stat(ckpt).catch(() => null)
  if (!ckptStat) {
    return NextResponse.json({
      error: 'Checkpoint Wav2Lip não encontrado. Baixe wav2lip_gan.pth (435MB) para ' + ckpt,
      hint: 'Rode tools/wav2lip/setup.ps1 ou defina W2LIP_CHECKPOINT.',
    }, { status: 501 })
  }
  const pyStat = process.platform === 'win32' ? await fs.stat(python).catch(() => null) : null
  if (process.platform === 'win32' && !pyStat) {
    return NextResponse.json({
      error: `Python não encontrado em ${python}. Instale em C:\\vitrine\\python310 ou defina W2LIP_PYTHON.`,
    }, { status: 501 })
  }

  try {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'w2l-'))

    const faceRes = await fetch(avatar.face_image_url, { signal: AbortSignal.timeout(60000) })
    if (!faceRes.ok) throw new Error('Não foi possível baixar a foto do avatar')
    const faceJpg = path.join(tmp, 'face.jpg')
    await fs.writeFile(faceJpg, Buffer.from(await faceRes.arrayBuffer()))

    const line = lineRaw || `Olá! Meu nome é ${avatar.name} e estou pronto para criar vídeos para a sua loja.`
    const speech = await generateSpeech(String(line), avatar.voice || 'pt-BR-FranciscaNeural')
    if (!speech) throw new Error('Falha ao gerar a narração (TTS indisponível)')
    const narrationMp3 = path.join(tmp, 'narration.mp3')
    await fs.writeFile(narrationMp3, speech)

    const outName = `avatar_${avatarId.slice(0, 8)}_${Date.now()}.mp4`
    const publicDir = path.join(process.cwd(), 'public', 'generated')
    await fs.mkdir(publicDir, { recursive: true })
    const outPath = path.join(publicDir, outName)

    const sizeRaw = Array.isArray(body.size) && body.size.length === 2 ? [Number(body.size[0]), Number(body.size[1])] : [576, 1024]
    const size = [Math.min(Math.max(sizeRaw[0] || 576, 256), 1280), Math.min(Math.max(sizeRaw[1] || 1024, 256), 1920)]
    if (size.some(n => !Number.isFinite(n))) return NextResponse.json({ error: 'size inválido (esperado [width,height]).' }, { status: 400 })
    const args = [
      runPy,
      '--face', faceJpg,
      '--audio', narrationMp3,
      '--checkpoint', ckpt,
      '--out', outPath,
      '--size', String(size[0]), String(size[1]),
    ]
    await execFileAsync(python, args, {
      timeout: 600000,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, FFMPEG: ffmpegPath! },
    })

    const { data: content } = await supabase.from('generated_content').insert({
      user_id: user.id,
      type: 'video',
      product_name: avatar.name,
      prompt_used: line,
      credits_used: 0,
      status: 'completed',
      result_url: `/generated/${outName}`,
      result_data: { provider: 'wav2lip-local', avatarId, voice: avatar.voice, category: 'avatar' },
    }).select().single()

    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
    return NextResponse.json({ videoUrl: `/generated/${outName}`, id: content?.id })
  } catch (e: any) {
    const msg = e?.killed ? 'Timeout ao animar avatar (10 min). Tente com frase mais curta.' : (e?.message || 'Erro ao animar avatar')
    // Never leak stack or python traceback details beyond message
    const safe = String(msg).slice(0, 500)
    return NextResponse.json({ error: safe }, { status: 500 })
  }
}