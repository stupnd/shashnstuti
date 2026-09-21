-- ============================================================================
-- Game sessions — one shared board per game for the couple.
-- Either person can read/write; Realtime keeps two phones in sync.
-- ============================================================================

create table public.game_sessions (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.game_sessions enable row level security;

create policy "members read games" on public.game_sessions
  for select using (public.is_member());

create policy "members upsert games" on public.game_sessions
  for insert with check (public.is_member());

create policy "members update games" on public.game_sessions
  for update using (public.is_member()) with check (public.is_member());

-- One row per game type (reset by rewriting `state`, not deleting).
insert into public.game_sessions (id, state) values
  ('ttt', '{}'::jsonb),
  ('connect4', '{}'::jsonb),
  ('memory', '{}'::jsonb),
  ('scoreboard', '{"players":{},"updated_at":null}'::jsonb);

-- Live sync across devices.
alter publication supabase_realtime add table public.game_sessions;
