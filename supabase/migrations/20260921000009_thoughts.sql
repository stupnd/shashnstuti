-- Tiny shared "thinking of you" board (synced live like the games).
insert into public.game_sessions (id, state) values
  ('thoughts', '{"items":[]}'::jsonb)
on conflict (id) do nothing;
