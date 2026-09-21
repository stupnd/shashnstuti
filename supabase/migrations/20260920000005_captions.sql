-- Short AI-written description of each photo (scripts/caption-photos.ts).
alter table public.photos add column if not exists caption text;
