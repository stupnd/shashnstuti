-- ============================================================================
-- Unread markers for the nav badges.
--
-- One timestamp per person per section. Defaulting (and backfilling) to now()
-- matters: with a null marker every existing message and moment would count as
-- unread and both tabs would open with a big number on them.
-- ============================================================================

alter table public.profiles
  add column if not exists seen_messages_at timestamptz not null default now(),
  add column if not exists seen_book_at timestamptz not null default now();

update public.profiles
   set seen_messages_at = coalesce(seen_messages_at, now()),
       seen_book_at = coalesce(seen_book_at, now());
