-- ============================================================================
-- Editable "custom slides" for Relationship Wrapped (e.g. inside joke of the
-- year, song of the year). Two slots per relationship year.
-- ============================================================================
create table public.wrapped_custom (
  year int not null,
  slot int not null check (slot in (1, 2)),
  label text not null default '',
  value text not null default '',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (year, slot)
);
alter table public.wrapped_custom enable row level security;

create policy "members read wrapped" on public.wrapped_custom
  for select using (public.is_member());
create policy "members write wrapped" on public.wrapped_custom
  for insert with check (public.is_member());
create policy "members update wrapped" on public.wrapped_custom
  for update using (public.is_member()) with check (public.is_member());

grant select, insert, update, delete on public.wrapped_custom to authenticated;
