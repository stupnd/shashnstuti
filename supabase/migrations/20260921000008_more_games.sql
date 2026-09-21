-- Add competitive game boards (dots & boxes, showdown). Drop unused memory row.
insert into public.game_sessions (id, state) values
  ('dots', '{}'::jsonb),
  ('showdown', '{}'::jsonb)
on conflict (id) do nothing;

delete from public.game_sessions where id = 'memory';
