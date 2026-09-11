# Setup do Wav2Lip (lip-sync) - Windows
# Roda em CPU. Tempo estimado: ~15 min (baixa Python, torch CPU e checkpoint 435MB).
# Depois de rodar, o ambiente fica em C:\vitrine\ (usado pelo app em /api/v1/avatar/animate).

$ErrorActionPreference = "Stop"

function Fail($msg) { Write-Host "FALHA: $msg" -ForegroundColor Red; exit 1 }

# 1) Python 3.10.11 (x64)
$py310 = "C:\vitrine\python310"
if (-not (Test-Path "$py310\python.exe")) {
  Write-Host "[1/4] Baixando Python 3.10.11..." -ForegroundColor Cyan
  $url = "https://www.python.org/ftp/python/3.10.11/python-3.10.11-amd64.exe"
  $inst = "$env:TEMP\python-3.10.11-amd64.exe"
  Invoke-WebRequest -Uri $url -OutFile $inst
  $args = "/quiet InstallAllUsers=0 TargetDir=$py310 Include_pip=1 Include_launcher=0 PrependPath=0 Shortcuts=0"
  Start-Process -Wait -FilePath $inst -ArgumentList $args
  if (-not (Test-Path "$py310\python.exe")) { Fail "Python 3.10.11 nao instalado em $py310" }
}

$pyExe = "$py310\python.exe"

# 2) dependencias (numpy<2 obrigatorio p/ torch 2.2.x)
Write-Host "[2/4] Instalando dependencias (torch CPU)..." -ForegroundColor Cyan
if (-not (Test-Path "$py310\Lib\site-packages\torch")) {
  & $pyExe -m pip install --upgrade pip
  & $pyExe -m pip install "numpy==1.26.4" scipy "opencv-python-headless==4.10.0.84"
  & $pyExe -m pip install "torch==2.2.2" --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple
}

# 3) Checkpoint Wav2Lip+GAN
Write-Host "[3/4] Baixando checkpoint wav2lip_gan.pth (435MB)..." -ForegroundColor Cyan
$ck = "C:\vitrine\w2lip\checkpoints"
New-Item -ItemType Directory -Path $ck -Force | Out-Null
if (-not (Test-Path "$ck\wav2lip_gan.pth")) {
  curl.exe -L -o "$ck\wav2lip_gan.pth" "https://huggingface.co/tensorbanana/wav2lip/resolve/main/wav2lip_gan.pth"
}

# 4) ffmpeg (reusa o do node_modules se existir)
Write-Host "[4/4] Verificando ffmpeg..." -ForegroundColor Cyan
$ff = Get-ChildItem "node_modules\ffmpeg-static" -Filter "ffmpeg*.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ff) {
  Copy-Item $ff.FullName "$py310\ffmpeg.exe" -Force
  Write-Host "ffmpeg copiado do node_modules -> $py310\ffmpeg.exe"
} else {
  Write-Host "Coloque um ffmpeg.exe em PATH ou use: `$env:FFMPEG = 'caminho\ffmpeg.exe'" -ForegroundColor Yellow
}

Write-Host "Pronto!" -ForegroundColor Green
Write-Host "Teste: & '$pyExe' 'C:\vitrine\w2lip\proj\run.py' --face foto.jpg --audio narracao.mp3 --checkpoint '$ck\wav2lip_gan.pth' --out resultado.mp4 --size 576 1024"