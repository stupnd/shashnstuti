-- ============================================================================
-- SEED — edit the start date below BEFORE running this file.
-- ============================================================================

-- Internal identities for the two of you. These must match src/lib/people.ts.
-- Nobody ever emails these addresses; they only exist so Supabase has two
-- distinct users to attach rows and RLS to.
insert into public.allowed_emails (email) values
  ('stuti@journal.local'),
  ('shash@journal.local')
on conflict (email) do nothing;

-- The day it all started.
insert into public.settings (id, start_date) values
  (1, '2023-09-21')
on conflict (id) do update set start_date = excluded.start_date;
