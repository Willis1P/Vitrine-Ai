"""
run.py - Wav2Lip talking-head for Windows (CPU-only friendly).

Input : --face foto.jpg|png (ou video.mp4)  +  --audio narracao.mp3|wav
Output: --out result.mp4 (foto animada, labios sincronizados com o audio)

Dependencies: torch (CPU), numpy, scipy, opencv-python-headless.
O mel-spectrogram abaixo usa so numpy+scipy (NAO usa librosa) para evitar o
inferno de instalacao librosa/numba/llvmlite no Windows. Foi validado
numericamente contra o librosa 0.9.2 com os constantes do hparams.py oficial.
"""
import argparse
import os
import subprocess
import sys
import tempfile
import time

import numpy as np

FFMPEG = os.environ.get("FFMPEG", "ffmpeg")

# ---------------- hiperparametros oficiais (hparams.py) ---------------------
SR = 16000
N_FFT = 800
HOP = 200
WIN = 800
N_MELS = 80
FMIN = 55.0
FMAX = 7600.0
PREEMPH = 0.97
REF_DB = 20
MIN_DB = -100.0
MAX_ABS = 4.0
MEL_STEP = 16
IMG_SIZE = 96
FPS = 25

YUNET_URL = ("https://github.com/opencv/opencv_zoo/raw/main/models/"
             "face_detection_yunet/face_detection_yunet_2023mar.onnx")


# ---------------- mel (port numpy fiel ao librosa 0.9.2) --------------------
def _hz_to_mel(f):
    f = np.asanyarray(f, dtype=np.float64)
    f_min, f_sp = 0.0, 200.0 / 3
    mels = (f - f_min) / f_sp
    if not f.ndim:
        mels = float(mels)
    min_log_hz = 1000.0
    min_log_mel = (min_log_hz - f_min) / f_sp
    logstep = np.log(6.4) / 27.0
    if f.ndim:
        out = mels.copy()
        out[f >= min_log_hz] = min_log_mel + np.log(f[f >= min_log_hz] / min_log_hz) / logstep
        return out
    if f >= min_log_hz:
        return min_log_mel + np.log(f / min_log_hz) / logstep
    return mels


def _mel_to_hz(mels):
    mels = np.asanyarray(mels, dtype=np.float64)
    f_min, f_sp = 0.0, 200.0 / 3
    freqs = f_min + f_sp * mels
    if not mels.ndim:
        freqs = float(freqs)
    min_log_hz = 1000.0
    min_log_mel = (min_log_hz - f_min) / f_sp
    logstep = np.log(6.4) / 27.0
    if mels.ndim:
        out = freqs.copy()
        out[mels >= min_log_mel] = min_log_hz * np.exp(logstep * (mels[mels >= min_log_mel] - min_log_mel))
        return out
    if mels >= min_log_mel:
        return min_log_hz * np.exp(logstep * (mels - min_log_mel))
    return freqs


def _mel_filterbank(sr, n_fft, n_mels, fmin, fmax):
    weights = np.zeros((n_mels, 1 + n_fft // 2), dtype=np.float64)
    fftfreqs = np.linspace(0.0, sr / 2.0, 1 + n_fft // 2)
    min_mel, max_mel = _hz_to_mel(fmin), _hz_to_mel(fmax)
    mel_f = _mel_to_hz(np.linspace(min_mel, max_mel, n_mels + 2))
    fdiff = np.diff(mel_f)
    ramps = np.subtract.outer(mel_f, fftfreqs)
    for i in range(n_mels):
        lower = -ramps[i] / fdiff[i]
        upper = ramps[i + 2] / fdiff[i + 1]
        weights[i] = np.maximum(0.0, np.minimum(lower, upper))
    enorm = 2.0 / (mel_f[2:n_mels + 2] - mel_f[:n_mels])
    weights *= enorm[:, np.newaxis]
    return weights.astype(np.float32)


_MEL_BASIS = None


def melspectrogram(wav):
    """wav float32 mono ~[-1,1) em SR. Retorna (80, T) em [-4,4]."""
    global _MEL_BASIS
    if _MEL_BASIS is None:
        _MEL_BASIS = _mel_filterbank(SR, N_FFT, N_MELS, FMIN, FMAX)

    y = wav.astype(np.float64)
    y = np.append(y[0], y[1:] - PREEMPH * y[:-1])            # pre-emphasis
    yp = np.pad(y, (N_FFT // 2, N_FFT // 2), mode="reflect")  # pad do librosa
    win = (0.5 - 0.5 * np.cos(2.0 * np.pi * np.arange(WIN) / WIN)).astype(np.float64)
    n_frames = 1 + (len(yp) - WIN) // HOP
    frames = np.lib.stride_tricks.sliding_window_view(yp, WIN)[::HOP][:n_frames]
    D = np.fft.rfft(frames * win, n=N_FFT, axis=1).T        # (401, T)

    S = np.dot(_MEL_BASIS, np.abs(D))
    min_level = np.exp(MIN_DB / 20.0 * np.log(10.0))
    S = 20.0 * np.log10(np.maximum(min_level, S)) - REF_DB
    S = np.clip(2 * MAX_ABS * ((S - MIN_DB) / -MIN_DB) - MAX_ABS, -MAX_ABS, MAX_ABS)
    return S.astype(np.float32)


# ---------------- modelo Wav2Lip (arquitetura oficial) ----------------------
def build_wav2lip():
    torch, nn = _import_torch()

    class Conv2d(nn.Module):
        def __init__(self, cin, cout, kernel_size, stride, padding, residual=False):
            super().__init__()
            self.conv_block = nn.Sequential(
                nn.Conv2d(cin, cout, kernel_size, stride, padding), nn.BatchNorm2d(cout))
            self.act = nn.ReLU()
            self.residual = residual

        def forward(self, x):
            out = self.conv_block(x)
            if self.residual:
                out = out + x
            return self.act(out)

    class Conv2dTranspose(nn.Module):
        def __init__(self, cin, cout, kernel_size, stride, padding, output_padding=0):
            super().__init__()
            self.conv_block = nn.Sequential(
                nn.ConvTranspose2d(cin, cout, kernel_size, stride, padding, output_padding),
                nn.BatchNorm2d(cout))
            self.act = nn.ReLU()

        def forward(self, x):
            return self.act(self.conv_block(x))

    class Wav2Lip(nn.Module):
        def __init__(self):
            super().__init__()
            self.face_encoder_blocks = nn.ModuleList([
                nn.Sequential(Conv2d(6, 16, 7, 1, 3)),
                nn.Sequential(Conv2d(16, 32, 3, 2, 1), Conv2d(32, 32, 3, 1, 1, True), Conv2d(32, 32, 3, 1, 1, True)),
                nn.Sequential(Conv2d(32, 64, 3, 2, 1), Conv2d(64, 64, 3, 1, 1, True), Conv2d(64, 64, 3, 1, 1, True),
                              Conv2d(64, 64, 3, 1, 1, True)),
                nn.Sequential(Conv2d(64, 128, 3, 2, 1), Conv2d(128, 128, 3, 1, 1, True), Conv2d(128, 128, 3, 1, 1, True)),
                nn.Sequential(Conv2d(128, 256, 3, 2, 1), Conv2d(256, 256, 3, 1, 1, True), Conv2d(256, 256, 3, 1, 1, True)),
                nn.Sequential(Conv2d(256, 512, 3, 2, 1), Conv2d(512, 512, 3, 1, 1, True)),
                nn.Sequential(Conv2d(512, 512, 3, 1, 0), Conv2d(512, 512, 1, 1, 0)),
            ])
            self.audio_encoder = nn.Sequential(
                Conv2d(1, 32, 3, 1, 1), Conv2d(32, 32, 3, 1, 1, True), Conv2d(32, 32, 3, 1, 1, True),
                Conv2d(32, 64, 3, (3, 1), 1), Conv2d(64, 64, 3, 1, 1, True), Conv2d(64, 64, 3, 1, 1, True),
                Conv2d(64, 128, 3, 3, 1), Conv2d(128, 128, 3, 1, 1, True), Conv2d(128, 128, 3, 1, 1, True),
                Conv2d(128, 256, 3, (3, 2), 1), Conv2d(256, 256, 3, 1, 1, True),
                Conv2d(256, 512, 3, 1, 0), Conv2d(512, 512, 1, 1, 0))
            self.face_decoder_blocks = nn.ModuleList([
                nn.Sequential(Conv2d(512, 512, 1, 1, 0)),
                nn.Sequential(Conv2dTranspose(1024, 512, 3, 1, 0), Conv2d(512, 512, 3, 1, 1, True)),
                nn.Sequential(Conv2dTranspose(1024, 512, 3, 2, 1, 1), Conv2d(512, 512, 3, 1, 1, True),
                              Conv2d(512, 512, 3, 1, 1, True)),
                nn.Sequential(Conv2dTranspose(768, 384, 3, 2, 1, 1), Conv2d(384, 384, 3, 1, 1, True),
                              Conv2d(384, 384, 3, 1, 1, True)),
                nn.Sequential(Conv2dTranspose(512, 256, 3, 2, 1, 1), Conv2d(256, 256, 3, 1, 1, True),
                              Conv2d(256, 256, 3, 1, 1, True)),
                nn.Sequential(Conv2dTranspose(320, 128, 3, 2, 1, 1), Conv2d(128, 128, 3, 1, 1, True),
                              Conv2d(128, 128, 3, 1, 1, True)),
                nn.Sequential(Conv2dTranspose(160, 64, 3, 2, 1, 1), Conv2d(64, 64, 3, 1, 1, True),
                              Conv2d(64, 64, 3, 1, 1, True)),
            ])
            self.output_block = nn.Sequential(
                Conv2d(80, 32, 3, 1, 1), nn.Conv2d(32, 3, 1, 1, 0), nn.Sigmoid())

        def forward(self, audio_sequences, face_sequences):
            audio_embedding = self.audio_encoder(audio_sequences)
            feats = []
            x = face_sequences
            for f in self.face_encoder_blocks:
                x = f(x)
                feats.append(x)
            x = audio_embedding
            for f in self.face_decoder_blocks:
                x = f(x)
                x = torch.cat((x, feats[-1]), dim=1)
                feats.pop()
            return self.output_block(x)

    return Wav2Lip()


# ---------------- utilitarios -------------------------------------------------
def _import_torch():
    try:
        import torch
        from torch import nn  # noqa: F401
        return torch, nn
    except ImportError as e:
        sys.exit("[run.py] PyTorch ausente. Instale com:\n"
                 "  pip install torch --index-url https://download.pytorch.org/whl/cpu\n"
                 f"  (detalhe do erro: {e})")


def run_ffmpeg(args_list):
    import shutil
    exe = FFMPEG if os.path.isfile(FFMPEG) else shutil.which(FFMPEG)
    if not exe:
        sys.exit("[run.py] ffmpeg nao encontrado. Baixe e extraia (ex. BtbN ffmpeg-master-latest-win64-gpl.zip)\n"
                 "        e aponte com:  $env:FFMPEG = 'C:\\temp\\ffmpeg\\bin\\ffmpeg.exe'")
    r = subprocess.run([exe] + args_list, capture_output=True)
    if r.returncode != 0:
        sys.exit("[run.py] ffmpeg falhou:\n  " + " ".join(args_list) + "\n  "
                 + r.stderr.decode(errors="ignore")[-800:])


def read_wav_float(path):
    from scipy.io import wavfile
    sr, data = wavfile.read(path)
    if data.dtype == np.int16:
        wav = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        wav = data.astype(np.float32) / 2147483648.0
    elif data.dtype == np.uint8:
        wav = (data.astype(np.float32) - 128.0) / 128.0
    elif data.dtype == np.float32:
        wav = data
    else:
        wav = data.astype(np.float32)
    if wav.ndim == 2:
        wav = wav.mean(axis=1)
    return wav.astype(np.float32)


def face_box(frame, box, model_dir, download=True):
    """Retorna (x1,y1,x2,y2) da caixa do rosto ou None. frame em BGR."""
    if box and box[0] != -1:
        return tuple(box)
    cv2 = __import__("cv2")
    h, w = frame.shape[:2]

    model_path = os.path.join(model_dir, "face_detection_yunet_2023mar.onnx")
    if not os.path.isfile(model_path) and download:
        try:
            import urllib.request
            print("  [face] baixando YuNet ONNX (232 KB)...")
            with urllib.request.urlopen(YUNET_URL, timeout=30) as r:
                data = r.read()
            with open(model_path, "wb") as fh:
                fh.write(data)
        except Exception as e:
            print(f"  [face] YuNet download falhou ({e}); vou de Haar cascade.")
    if os.path.isfile(model_path):
        try:
            det = cv2.FaceDetectorYN_create(model_path, "", (w, h), 0.5, 0.3, 5000)
            det.setInputSize((w, h))
            ok, faces = det.detect(frame)
            if ok and faces is not None:
                x, y, bw, bh = faces[0][:4].astype(int)
                return (max(0, x), max(0, y), min(w, x + bw), min(h, y + bh))
        except Exception as e:
            print(f"  [face] YuNet erro ({e}); vou de Haar cascade.")

    casc = cv2.CascadeClassifier(
        os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    found = casc.detectMultiScale(gray, 1.1, 5, minSize=(max(80, w // 8), max(80, w // 8)))
    if len(found):
        x, y, bw, bh = found[0]
        return (max(0, x), max(0, y), min(w, x + bw), min(h, y + bh))
    return None


# ---------------- main --------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Wav2Lip talking-head (CPU ok)")
    ap.add_argument("--face", required=True, help="foto .jpg/.png/.jpeg ou video mp4")
    ap.add_argument("--audio", required=True, help="audio .mp3/.wav/.m4a/... (qualquer formato p/ ffmpeg)")
    ap.add_argument("--out", default="result.mp4", help="mp4 final")
    ap.add_argument("--checkpoint", required=True,
                    help="wav2lip_gan.pth: caminho local OU URL http(s) (baixa automaticamente)")
    ap.add_argument("--size", nargs=2, type=int, default=[576, 1024], help="tamanho do video (padrao 9:16)")
    ap.add_argument("--fps", type=float, default=25.0)
    ap.add_argument("--pads", nargs=4, type=int, default=[0, 10, 0, 0],
                    help="padding da caixa do rosto: topo, baixo, esq, dir")
    ap.add_argument("--box", nargs=4, type=int, default=[-1, -1, -1, -1],
                    help="caixa fixa manual (topo, baixo, esq, dir) se a deteccao falhar")
    ap.add_argument("--batch", type=int, default=32, help="chunks por batch (RAM vs velocidade)")
    ap.add_argument("--no-download", action="store_true", help="nao baixar nada")
    args = ap.parse_args()

    cv2 = __import__("cv2")
    cv2.setNumThreads(0)
    torch, _ = _import_torch()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[run.py] device = {device}")

    tmp = tempfile.mkdtemp(prefix="w2l_")
    model_dir = os.path.dirname(os.path.abspath(args.checkpoint))

    # ---- checkpoint --------------------------------------------------------
    ckpt = args.checkpoint
    if ckpt.startswith("http"):
        local_ckpt = os.path.join(model_dir, os.path.basename(ckpt.split("?")[0]) or "wav2lip_gan.pth")
        if not os.path.isfile(local_ckpt):
            if args.no_download:
                sys.exit("[run.py] --no-download conflita com checkpoint por URL.")
            import urllib.request
            print(f"[run.py] baixando checkpoint {ckpt}")
            urllib.request.urlretrieve(ckpt, local_ckpt)
        ckpt = local_ckpt
    if not os.path.isfile(ckpt):
        sys.exit(f"[run.py] checkpoint nao encontrado: {ckpt}")

    # ---- audio -------------------------------------------------------------
    wav_path = os.path.join(tmp, "audio16k.wav")
    run_ffmpeg(["-y", "-i", args.audio, "-vn", "-ac", "1", "-ar", str(SR), wav_path])
    wav = read_wav_float(wav_path)
    if wav.size == 0 or float(np.max(np.abs(wav))) < 1e-4:
        sys.exit("[run.py] audio mudo ou vazio.")
    mel = melspectrogram(wav)
    if np.isnan(mel).sum() > 0:
        print("  [warn] mel continha NaN (TTS muito seco?). Zerando...")
        mel = np.nan_to_num(mel, nan=0.0, posinf=MAX_ABS, neginf=-MAX_ABS)

    # ---- frames ------------------------------------------------------------
    ext = os.path.splitext(args.face)[1].lower()
    W, H = args.size
    if ext in (".jpg", ".jpeg", ".png", ".webp", ".bmp"):
        img = cv2.imread(args.face)
        if img is None:
            sys.exit(f"[run.py] falha ao ler imagem: {args.face}")
        ih, iw = img.shape[:2]
        scale = max(W / iw, H / ih)
        img = cv2.resize(img, (int(round(iw * scale)), int(round(ih * scale))))
        oh, ow = img.shape[:2]
        y0, x0 = (oh - H) // 2, (ow - W) // 2
        frame = img[y0:y0 + H, x0:x0 + W]
        if frame.shape[0] != H or frame.shape[1] != W:
            frame = cv2.resize(frame, (W, H))
        frames = [frame]
        static = True
        print(f"[run.py] foto -> {W}x{H} (cover-fit).")
    else:
        cap = cv2.VideoCapture(args.face)
        frames = []
        while True:
            ok, fr = cap.read()
            if not ok:
                break
            frames.append(fr)
        cap.release()
        if not frames:
            sys.exit(f"[run.py] nao consegui ler frames do video: {args.face}")
        static = False

    # ---- mel chunks --------------------------------------------------------
    step = 80.0 / args.fps
    n_chunks = int(np.ceil((mel.shape[1] - MEL_STEP) / step))
    if n_chunks <= 0:
        sys.exit("[run.py] audio muito curto (menos que ~0.2s).")
    mel_chunks = [mel[:, min(int(i * step), mel.shape[1] - MEL_STEP):min(int(i * step), mel.shape[1] - MEL_STEP) + MEL_STEP]
                  for i in range(n_chunks)]
    print(f"[run.py] audio {mel.shape[1]*12.5/1000:.2f}s -> {len(mel_chunks)} frames de video @ {args.fps:.0f}fps")

    if static:
        frames = [frames[0] for _ in range(len(mel_chunks))]
    else:
        frames = (frames * ((len(mel_chunks) // len(frames)) + 1))[:len(mel_chunks)]

    # ---- caixa do rosto ----------------------------------------------------
    box = face_box(frames[0], args.box, model_dir, download=not args.no_download)
    if box is None:
        sys.exit("[run.py] rosto nao detectado. Use --box topo baixo esq dir "
                 "ou corte a foto mais perto do rosto.")
    b = list(box)
    b = [max(0, b[0] - args.pads[2]), max(0, b[1] - args.pads[0]),
         min(frames[0].shape[1], b[2] + args.pads[3]), min(frames[0].shape[0], b[3] + args.pads[1])]
    x1, y1, x2, y2 = b
    print(f"[run.py] caixa do rosto: top={y1} bot={y2} esq={x1} dir={x2}")

    # ---- modelo ------------------------------------------------------------
    print("[run.py] carregando modelo (CPU)...")
    model = build_wav2lip()
    ck = torch.load(ckpt, map_location=lambda storage, loc: storage)
    sd = {k.replace("module.", ""): v for k, v in ck["state_dict"].items()}
    model.load_state_dict(sd)
    model.to(device).eval()
    print("[run.py] modelo carregado.")

    # ---- inferencia --------------------------------------------------------
    out_h, out_w = frames[0].shape[:2]
    raw_avi = os.path.join(tmp, "raw.avi")
    vw = cv2.VideoWriter(raw_avi, cv2.VideoWriter_fourcc(*"MJPG"), args.fps, (out_w, out_h))
    if not vw.isOpened():
        sys.exit("[run.py] falha ao criar VideoWriter (codec MJPG ausente no opencv?).")

    t0 = time.time()
    n_total = len(mel_chunks)
    with torch.no_grad():
        for i in range(0, n_total, args.batch):
            mb = np.array(mel_chunks[i:i + args.batch])                 # (B,80,16)
            fb = np.array(frames[i:i + args.batch])
            crops = np.stack([cv2.resize(fb[j][y1:y2, x1:x2], (IMG_SIZE, IMG_SIZE)) for j in range(len(fb))])
            masked = crops.copy(); masked[:, IMG_SIZE // 2:] = 0
            input_img = np.concatenate((masked, crops), axis=3) / 255.0
            input_img = torch.FloatTensor(np.transpose(input_img, (0, 3, 1, 2))).to(device)
            input_mel = torch.FloatTensor(mb[:, None, :, :]).to(device)   # (B,1,80,16)
            pred = model(input_mel, input_img).cpu().numpy().transpose(0, 2, 3, 1) * 255.0
            for p, f in zip(pred, fb):
                p = cv2.resize(p.astype(np.uint8), (x2 - x1, y2 - y1))
                f[y1:y2, x1:x2] = p
                vw.write(f)
            done = i + len(fb)
            el = time.time() - t0
            print(f"  {done}/{n_total} frames  ({done/el:.2f} fps, {el:.1f}s)", end="\r")
    vw.release()
    dt = time.time() - t0
    print(f"\n[run.py] inferencia: {n_total} frames em {dt:.1f}s = "
          f"{n_total/dt:.2f} fps CPU. ({n_total/args.fps:.1f}s de video.)")

    # ---- mp4 final ----------------------------------------------------------
    run_ffmpeg(["-y", "-i", raw_avi, "-i", wav_path,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart", "-shortest", args.out])
    import shutil
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"[run.py] OK -> {os.path.abspath(args.out)}")


if __name__ == "__main__":
    main()