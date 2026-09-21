-- Shared Spotify playlist / album / track for scrapbook background music.
alter table public.settings
  add column if not exists spotify_url text;

comment on column public.settings.spotify_url is
  'Spotify open.spotify.com URL (playlist, album, or track) shown in the in-app player.';
