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
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const avatarId = (body.avatarId || '').toString()
  if (!avatarId) return NextResponse.json({ error: 'Informe o avatarId' }, { status: 400 })

  const { data: avatar } = await supabase
    .from('avatars')
    .select('*')
    .eq('id', avatarId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!avatar) return NextResponse.json({ error: 'Avatar não encontrado' }, { status: 404 })

  const python = process.env.W2LIP_PYTHON || 'C:\\vitrine\\python310\\python.exe'
  const runPy = process.env.W2LIP_RUN || 'C:\\vitrine\\w2lip\\proj\\run.py'
  const ckpt = process.env.W2LIP_CHECKPOINT || 'C:\\vitrine\\w2lip\\checkpoints\\wav2lip_gan.pth'

  if (!(await fs.stat(runPy).catch(() => null))) {
    return NextResponse.json({
      error: 'Pipelines de lip-sync não instalados. Rode: powershell -ExecutionPolicy Bypass -File tools/wav2lip/setup.ps1',
    }, { status: 501 })
  }

  try {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'w2l-'))

    const faceRes = await fetch(avatar.face_image_url, { signal: AbortSignal.timeout(60000) })
    if (!faceRes.ok) throw new Error('Não foi possível baixar a foto do avatar')
    const faceJpg = path.join(tmp, 'face.jpg')
    await fs.writeFile(faceJpg, Buffer.from(await faceRes.arrayBuffer()))

    const line = body.line || `Olá! Meu nome é ${avatar.name} e estou pronto para criar vídeos para a sua loja.`
    const speech = await generateSpeech(String(line), avatar.voice)
    if (!speech) throw new Error('Falha ao gerar a narração (TTS indisponível)')
    const narrationMp3 = path.join(tmp, 'narration.mp3')
    await fs.writeFile(narrationMp3, speech)

    const outName = `avatar_${avatarId.slice(0, 8)}_${Date.now()}.mp4`
    const publicDir = path.join(process.cwd(), 'public', 'generated')
    await fs.mkdir(publicDir, { recursive: true })
    const outPath = path.join(publicDir, outName)

    const size = Array.isArray(body.size) && body.size.length === 2 ? [Number(body.size[0]), Number(body.size[1])] : [576, 1024]
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
      type: 'avatar',
      product_name: avatar.name,
      prompt_used: line,
      credits_used: 0,
      status: 'completed',
      result_url: `/generated/${outName}`,
      result_data: { provider: 'wav2lip-local', avatarId, voice: avatar.voice },
    }).select().single()

    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
    return NextResponse.json({ videoUrl: `/generated/${outName}`, id: content?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro ao animar avatar' }, { status: 500 })
  }
}