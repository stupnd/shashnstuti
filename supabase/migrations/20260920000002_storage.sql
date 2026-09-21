-- ============================================================================
-- Private photo bucket. Nothing in here is public; the app always serves
-- images through short-lived signed URLs, which Supabase only issues to a
-- session that passes the SELECT policy below.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  10485760,                                   -- 10 MB per object
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are stored as  <entry_id>/<photo_id>.webp  so ownership can be
-- checked from the path's first folder.
create policy "members read photos bucket" on storage.objects
  for select using (bucket_id = 'photos' and public.is_member());

create policy "members upload to own entries" on storage.objects
  for insert with check (
    bucket_id = 'photos'
    and public.is_member()
    and public.owns_entry(((storage.foldername(name))[1])::uuid)
  );

create policy "members update own photos" on storage.objects
  for update using (
    bucket_id = 'photos'
    and public.is_member()
    and public.owns_entry(((storage.foldername(name))[1])::uuid)
  );

create policy "members delete own photos" on storage.objects
  for delete using (
    bucket_id = 'photos'
    and public.is_member()
    and public.owns_entry(((storage.foldername(name))[1])::uuid)
  );
