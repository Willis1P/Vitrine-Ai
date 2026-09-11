# Integração TikTok — Vitrine AI

## Como solicitar acesso à API de Postagem do TikTok

1. Acesse [https://developers.tiktok.com/](https://developers.tiktok.com/) e crie uma conta de desenvolvedor.
2. Crie um novo App em **Manage Apps > Create App**.
3. Escolha o tipo **Web** e configure o **Redirect URI** (ex: `https://seudominio.com/api/v1/tiktok/publish`).
4. Na aba **Permissions**, solicite as seguintes permissões:
   - `user.info.basic` — leitura de dados básicos do perfil
   - `video.upload` — upload de vídeos
   - `video.publish` — publicação de vídeos
5. Envie o app para revisão. O TikTok pode levar de dias a semanas para aprovar.
6. Após aprovação, copie o **Client Key** e **Client Secret** da aba **Basic Info**.

## Variáveis de ambiente

Adicione ao seu `.env.local`:

```
TIKTOK_CLIENT_KEY=seu_client_key_aqui
TIKTOK_CLIENT_SECRET=seu_client_secret_aqui
TIKTOK_REDIRECT_URI=https://seudominio.com/api/v1/tiktok/publish
```

## Fluxo OAuth

1. O frontend chama `POST /api/v1/tiktok/publish` com `{ action: "auth-url" }`.
2. Redirecione o usuário para a `authUrl` retornada.
3. Após autorização, o TikTok redireciona para o `redirect_uri` com um `code`.
4. O frontend chama `POST /api/v1/tiktok/publish` com `{ action: "token", code: "..." }`.
5. O backend retorna `openId`, `accessToken`, `refreshToken` e `expiresIn`.
6. O frontend armazena os tokens no `localStorage` (MVP).

## Publicar vídeo

```
POST /api/v1/tiktok/publish
{
  "action": "publish",
  "accessToken": "...",
  "openId": "...",
  "videoUrl": "/generated/video_abc.mp4",
  "title": "Meu produto incrível",
  "privacyLevel": "PUBLIC_TO_EVERYONE"
}
```

Retorna `{ publishId, status }`.

## Verificar status

```
POST /api/v1/tiktok/publish
{
  "action": "status",
  "accessToken": "...",
  "publishId": "..."
}
```

Retorna `{ status, failReason? }`.

Status possíveis: `PUBLISHED`, `PROCESSING_UPLOAD`, `SEND_TO_USER_INBOX`, `FAILED`, `UNKNOWN`.

## Limites e considerações

- **Tamanho máximo do vídeo:** 64MB.
- **Rate limit:** ~1 publicação por hora por usuário do TikTok.
- **Chunks:** o upload é feito em blocos de 1MB com `Content-Range`.
- **Tokens:** o MVP armazena tokens no `localStorage` do cliente. Em produção, armazene server-side com criptografia (ex: AES-256 no banco de dados).
- **Refresh token:** use `action: "token"` com o `refresh_token` para renovar tokens expirados (implementação disponível em `lib/tiktok.ts`).
- **Ambiente de teste:** sem credenciais reais, a API retorna erros informativos com `hint` explicando o que configurar.

## Arquivos

- `lib/tiktok.ts` — funções de configuração, OAuth, upload chunked, publicação e polling.
- `app/api/v1/tiktok/publish/route.ts` — rota POST com autenticação via Supabase.
