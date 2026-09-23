-- Device push subscriptions for home-screen / PWA notifications.
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create policy "read own push subscriptions" on public.push_subscriptions
  for select using (public.is_member() and user_id = auth.uid());
create policy "upsert own push subscriptions" on public.push_subscriptions
  for insert with check (public.is_member() and user_id = auth.uid());
create policy "update own push subscriptions" on public.push_subscriptions
  for update using (public.is_member() and user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "delete own push subscriptions" on public.push_subscriptions
  for delete using (public.is_member() and user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
