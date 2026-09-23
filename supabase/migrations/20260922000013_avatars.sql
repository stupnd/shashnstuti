-- ============================================================================
-- Profile photos.
--
-- Kept private like everything else: the app serves them through short-lived
-- signed URLs. There are only ever two profiles, so both avatars are signed
-- in a single request-cached call — see getProfiles() in src/lib/data.ts.
--
-- Objects are stored as  <user_id>/<random>.webp  so ownership is the path's
-- first folder, the same trick the photos bucket uses with entry ids.
-- ============================================================================

alter table public.profiles add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,                                    -- 2 MB is plenty for a face
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "members read avatars" on storage.objects
  for select using (bucket_id = 'avatars' and public.is_member());

create policy "upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "replace own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "delete own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
