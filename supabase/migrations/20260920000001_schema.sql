-- ============================================================================
-- Our Journal — schema + row level security
--
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Everything is locked down so that ONLY the two emails in `allowed_emails`
-- can read or write anything. Enforcement happens in three layers:
--   1. A BEFORE INSERT trigger on auth.users rejects sign-ups from any other
--      email, so a stranger can't even get a magic link.
--   2. `is_member()` checks the JWT email against `allowed_emails`, and every
--      RLS policy below requires it.
--   3. Row ownership: you can only edit/delete what you wrote.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Allowlist (no API access: RLS on, zero policies — only reachable via the
-- security-definer functions below)
-- ----------------------------------------------------------------------------
create table public.allowed_emails (
  email text primary key check (email = lower(email))
);
alter table public.allowed_emails enable row level security;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function public.is_member()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select auth.uid() is not null
     and exists (
       select 1 from public.allowed_emails a
       where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
     );
$$;

-- Reject any auth user whose email isn't on the list.
create or replace function public.enforce_allowlist()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_emails where email = lower(new.email)
  ) then
    raise exception 'This journal is just for two' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_allowlist_on_signup
  before insert on auth.users
  for each row execute function public.enforce_allowlist();

-- ----------------------------------------------------------------------------
-- profiles — one row per person (display name + emoji avatar)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  avatar_emoji text not null default '🤍',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "members read profiles" on public.profiles
  for select using (public.is_member());
create policy "edit own profile" on public.profiles
  for update using (public.is_member() and id = auth.uid())
  with check (id = auth.uid());

-- Auto-create the profile when an allowed user signs in for the first time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, lower(new.email), split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger create_profile_on_signup
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- settings — single row (id is always 1)
-- ----------------------------------------------------------------------------
create table public.settings (
  id int primary key default 1 check (id = 1),
  start_date date not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;

create policy "members read settings" on public.settings
  for select using (public.is_member());
create policy "members update settings" on public.settings
  for update using (public.is_member()) with check (public.is_member());

-- ----------------------------------------------------------------------------
-- entries — a "moment"
-- ----------------------------------------------------------------------------
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,                       -- when it happened, not when uploaded
  title text,
  note text not null default '',            -- empty note => "add a note 💭" prompt
  place text,
  place_lat double precision,               -- filled by geocoding when place is set
  place_lng double precision,
  author uuid not null references public.profiles (id) on delete cascade,
  mood text,                                -- a single emoji
  tags text[] not null default '{}',
  is_milestone boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.entries enable row level security;

create index entries_date_idx on public.entries (date desc, created_at desc);
create index entries_author_idx on public.entries (author);
create index entries_tags_idx on public.entries using gin (tags);

create policy "members read entries" on public.entries
  for select using (public.is_member());
create policy "members add own entries" on public.entries
  for insert with check (public.is_member() and author = auth.uid());
create policy "edit own entries" on public.entries
  for update using (public.is_member() and author = auth.uid())
  with check (author = auth.uid());
create policy "delete own entries" on public.entries
  for delete using (public.is_member() and author = auth.uid());

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger entries_touch_updated_at
  before update on public.entries
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- photos — many per entry
-- ----------------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  storage_path text not null unique,        -- object key in the `photos` bucket
  width int not null,
  height int not null,
  taken_at timestamptz,
  date_source text not null default 'manual'
    check (date_source in ('exif', 'filename', 'mtime', 'manual')),
  source_hash text unique,                  -- sha256 of the original file (import dedupe)
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.photos enable row level security;

create index photos_entry_idx on public.photos (entry_id, sort_order);

-- "owns entry" = the photo's parent entry was written by me
create or replace function public.owns_entry(p_entry_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.entries e
    where e.id = p_entry_id and e.author = auth.uid()
  );
$$;

create policy "members read photos" on public.photos
  for select using (public.is_member());
create policy "add photos to own entries" on public.photos
  for insert with check (public.is_member() and public.owns_entry(entry_id));
create policy "edit photos of own entries" on public.photos
  for update using (public.is_member() and public.owns_entry(entry_id))
  with check (public.owns_entry(entry_id));
create policy "delete photos of own entries" on public.photos
  for delete using (public.is_member() and public.owns_entry(entry_id));

-- ----------------------------------------------------------------------------
-- reactions — emoji + short reply on an entry
-- ----------------------------------------------------------------------------
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  author uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  reply text,
  created_at timestamptz not null default now()
);
alter table public.reactions enable row level security;

create index reactions_entry_idx on public.reactions (entry_id, created_at);

create policy "members read reactions" on public.reactions
  for select using (public.is_member());
create policy "members add own reactions" on public.reactions
  for insert with check (public.is_member() and author = auth.uid());
create policy "edit own reactions" on public.reactions
  for update using (public.is_member() and author = auth.uid())
  with check (author = auth.uid());
create policy "delete own reactions" on public.reactions
  for delete using (public.is_member() and author = auth.uid());

-- ----------------------------------------------------------------------------
-- letters — "open when..." + date-locked letters
--
-- The body of a locked letter must not be readable by the recipient before
-- unlock_at, so the SELECT policy hides those rows from the recipient
-- entirely. The recipient sees locked envelopes (title + countdown) through
-- `my_locked_letters()`, and `open_letter()` stamps opened_at.
-- ----------------------------------------------------------------------------
create table public.letters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author uuid not null references public.profiles (id) on delete cascade,
  recipient uuid not null references public.profiles (id) on delete cascade,
  unlock_at timestamptz,                    -- null = "open when you feel like it"
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  check (author <> recipient)
);
alter table public.letters enable row level security;

create index letters_recipient_idx on public.letters (recipient, created_at desc);

create policy "read own or unlocked letters" on public.letters
  for select using (
    public.is_member() and (
      author = auth.uid()
      or (recipient = auth.uid() and (unlock_at is null or unlock_at <= now()))
    )
  );
create policy "write own letters" on public.letters
  for insert with check (public.is_member() and author = auth.uid());
create policy "edit own letters" on public.letters
  for update using (public.is_member() and author = auth.uid())
  with check (author = auth.uid());
create policy "delete own letters" on public.letters
  for delete using (public.is_member() and author = auth.uid());

-- Locked envelopes addressed to me: metadata only, never the body.
create or replace function public.my_locked_letters()
returns table (
  id uuid, title text, author uuid, unlock_at timestamptz, created_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select l.id, l.title, l.author, l.unlock_at, l.created_at
  from public.letters l
  where public.is_member()
    and l.recipient = auth.uid()
    and l.unlock_at is not null
    and l.unlock_at > now()
  order by l.unlock_at asc;
$$;

-- Recipient opens a letter (idempotent). Returns the opened_at timestamp.
create or replace function public.open_letter(p_id uuid)
returns timestamptz
language plpgsql security definer
set search_path = public
as $$
declare
  v_opened timestamptz;
begin
  if not public.is_member() then
    raise exception 'not allowed';
  end if;
  update public.letters
     set opened_at = coalesce(opened_at, now())
   where id = p_id
     and recipient = auth.uid()
     and (unlock_at is null or unlock_at <= now())
  returning opened_at into v_opened;
  if v_opened is null then
    raise exception 'letter is locked or not addressed to you';
  end if;
  return v_opened;
end;
$$;

-- ----------------------------------------------------------------------------
-- Grants: PostgREST roles need table access; RLS does the real gating.
-- (Supabase already grants these by default on public, but be explicit.)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
revoke all on public.allowed_emails from anon, authenticated;
grant execute on function public.is_member() to authenticated;
grant execute on function public.owns_entry(uuid) to authenticated;
grant execute on function public.my_locked_letters() to authenticated;
grant execute on function public.open_letter(uuid) to authenticated;
