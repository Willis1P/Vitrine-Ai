-- avatars: personas persistentes do usuario (foto do rosto + voz)
create table if not exists public.avatars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  voice text not null default 'pt-BR-FranciscaNeural',
  face_image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists avatars_user_id_idx on public.avatars (user_id);

alter table public.avatars enable row level security;

drop policy if exists "avatars select own" on public.avatars;
create policy "avatars select own" on public.avatars
  for select using ((select public.is_admin()) or auth.uid() = user_id);

drop policy if exists "avatars insert own" on public.avatars;
create policy "avatars insert own" on public.avatars
  for insert with check ((select public.is_admin()) or auth.uid() = user_id);

drop policy if exists "avatars update own" on public.avatars;
create policy "avatars update own" on public.avatars
  for update using ((select public.is_admin()) or auth.uid() = user_id);

drop policy if exists "avatars delete own" on public.avatars;
create policy "avatars delete own" on public.avatars
  for delete using ((select public.is_admin()) or auth.uid() = user_id);