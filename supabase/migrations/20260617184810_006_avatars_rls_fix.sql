-- ============================================
-- Fix avatars RLS: public.is_admin() does not exist -> queries fail with 500/403
-- Replace with standard EXISTS (profiles.role = 'admin') pattern used elsewhere
-- Idempotent
-- ============================================

-- Define is_admin() correctly for backwards compat (some policies reference it)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- Recreate avatars policies with correct USING and WITH CHECK, fixing recursion/performance

drop policy if exists "avatars select own" on public.avatars;
create policy "avatars select own" on public.avatars
  for select to authenticated
  using ((select public.is_admin()) or auth.uid() = user_id);

drop policy if exists "avatars insert own" on public.avatars;
create policy "avatars insert own" on public.avatars
  for insert to authenticated
  with check ((select public.is_admin()) or auth.uid() = user_id);

drop policy if exists "avatars update own" on public.avatars;
create policy "avatars update own" on public.avatars
  for update to authenticated
  using ((select public.is_admin()) or auth.uid() = user_id)
  with check ((select public.is_admin()) or auth.uid() = user_id);

drop policy if exists "avatars delete own" on public.avatars;
create policy "avatars delete own" on public.avatars
  for delete to authenticated
  using ((select public.is_admin()) or auth.uid() = user_id);

-- Ensure RLS still enabled
alter table public.avatars enable row level security;
