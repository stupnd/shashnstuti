-- Photos pinned to the scrapbook home page (shared between both of you).
create table public.home_pins (
  photo_id uuid primary key references public.photos (id) on delete cascade,
  pinned_by uuid not null references public.profiles (id) on delete cascade,
  pinned_at timestamptz not null default now(),
  sort_order int not null default 0
);

alter table public.home_pins enable row level security;

create index home_pins_order_idx on public.home_pins (sort_order, pinned_at desc);

create policy "members read home pins" on public.home_pins
  for select using (public.is_member());
create policy "members add home pins" on public.home_pins
  for insert with check (public.is_member() and pinned_by = auth.uid());
create policy "members update home pins" on public.home_pins
  for update using (public.is_member())
  with check (public.is_member());
create policy "members remove home pins" on public.home_pins
  for delete using (public.is_member());

grant select, insert, update, delete on public.home_pins to authenticated;
