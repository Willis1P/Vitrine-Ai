-- ============================================
-- Fix profiles.unlimited column missing
-- lib/supabase/client.ts expects profiles.unlimited boolean
-- hooks/use-auth.tsx and api routes do select unlimited
-- Without column -> 42703 column does not exist, PGRST116, breaks credits check
-- Idempotent
-- ============================================

alter table public.profiles add column if not exists unlimited boolean not null default false;

-- Also ensure updated_at trigger still applies
drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- Allow unlimited to be read by own select (already covered by profiles_select_own)
-- Admin can update unlimited via service_role or direct sql; add policy for admin update if needed
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
