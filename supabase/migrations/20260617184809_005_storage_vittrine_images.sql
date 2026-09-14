-- ============================================
-- Storage: vittrine-images bucket + RLS policies
-- Fixes 400/403 on uploads/* and avatars/* paths
-- Idempotent, safe to rerun
-- ============================================

-- 1) Create bucket (public = true for templates/trending/public generated)
insert into storage.buckets (id, name, public)
values ('vittrine-images', 'vittrine-images', true)
on conflict (id) do update set public = true;

-- 2) Enable RLS already enabled on storage.objects, create policies

-- Public read for everyone (templates, courses, trending are public)
drop policy if exists "vittrine-images public read" on storage.objects;
create policy "vittrine-images public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vittrine-images');

-- Authenticated upload to own folder: uploads/<uid>/* and uploads/avatars/<uid>/*
drop policy if exists "vittrine-images authenticated upload own" on storage.objects;
create policy "vittrine-images authenticated upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vittrine-images'
    and (
      (storage.foldername(name))[1] = 'uploads'
      and (
        -- uploads/<uid>/...  or uploads/avatars/<uid>/...
        name like 'uploads/' || auth.uid()::text || '/%'
        or name like 'uploads/avatars/' || auth.uid()::text || '/%'
        or name like 'uploads/' || auth.uid()::text || '-%'
      )
    )
  );

-- Allow broader uploads/* for backwards compat if no subfolder: uploads/<anything> but must be authenticated
-- (kept permissive for legacy pipeline uploads that used random names without uid prefix)
drop policy if exists "vittrine-images uploads legacy" on storage.objects;
create policy "vittrine-images uploads legacy" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vittrine-images'
    and (storage.foldername(name))[1] = 'uploads'
  );

-- Allow authenticated to update/delete own objects (same prefix logic)
drop policy if exists "vittrine-images authenticated update own" on storage.objects;
create policy "vittrine-images authenticated update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vittrine-images'
    and owner = auth.uid()
  )
  with check (bucket_id = 'vittrine-images');

drop policy if exists "vittrine-images authenticated delete own" on storage.objects;
create policy "vittrine-images authenticated delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vittrine-images'
    and (owner = auth.uid() or name like 'uploads/' || auth.uid()::text || '/%')
  );

-- Admin bypass: allow admin to manage all objects via service_role (service_role bypasses RLS anyway)
-- No explicit policy needed for service_role; it bypasses RLS.
