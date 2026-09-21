-- Shared wins / losses / draws for the couple's games.
insert into public.game_sessions (id, state)
values ('scoreboard', '{"players":{},"updated_at":null}'::jsonb)
on conflict (id) do nothing;
