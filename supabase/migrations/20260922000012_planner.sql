-- ============================================================================
-- Planner — a shared list of things to do (restaurants, date ideas, presents)
-- plus a calendar of the dates you've actually picked a day for.
--
-- Both of these are *ours*, not *mine*: either person can tick something off
-- or clear it, so the policies below gate on membership rather than ownership.
-- `created_by` is kept for attribution ("shash added this") only.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- plans — one planned date on the calendar
-- ----------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  at_time time,                             -- null = "sometime that day"
  title text not null,
  note text not null default '',
  place text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  done_at timestamptz,                      -- ticked off once it happened
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plans enable row level security;

create index plans_date_idx on public.plans (date, at_time nulls first);

create policy "members read plans" on public.plans
  for select using (public.is_member());
create policy "members add plans" on public.plans
  for insert with check (public.is_member() and created_by = auth.uid());
create policy "members edit plans" on public.plans
  for update using (public.is_member()) with check (public.is_member());
create policy "members delete plans" on public.plans
  for delete using (public.is_member());

create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- wishes — date ideas and present ideas, logged whenever one strikes
-- ----------------------------------------------------------------------------
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'date' check (kind in ('present', 'date')),
  title text not null,
  note text not null default '',
  url text,                                 -- a link to the thing, for presents
  for_id uuid references public.profiles (id) on delete set null,  -- who it's for
  created_by uuid not null references public.profiles (id) on delete cascade,
  done_at timestamptz,                      -- got it / did it
  done_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.wishes enable row level security;

create index wishes_kind_idx on public.wishes (kind, done_at nulls first, created_at desc);

create policy "members read wishes" on public.wishes
  for select using (public.is_member());
create policy "members add wishes" on public.wishes
  for insert with check (public.is_member() and created_by = auth.uid());
create policy "members edit wishes" on public.wishes
  for update using (public.is_member()) with check (public.is_member());
create policy "members delete wishes" on public.wishes
  for delete using (public.is_member());

-- ----------------------------------------------------------------------------
-- Grants + live updates (so an idea added on one phone appears on the other)
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on public.plans to authenticated;
grant select, insert, update, delete on public.wishes to authenticated;

alter publication supabase_realtime add table public.plans;
alter publication supabase_realtime add table public.wishes;
