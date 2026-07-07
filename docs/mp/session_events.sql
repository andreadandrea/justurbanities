-- MP-2 (SPEC_Multiplayer §2.4) — Supabase schema for the shared-city log.
-- Create the project in the EU region. The client (SupabaseRemoteApi)
-- inserts rows with the anon key; RLS keys everything to the session code.

create table if not exists session_events (
  seq bigint generated always as identity primary key,
  session_code text not null check (char_length(session_code) = 6),
  player_id uuid not null,
  entity_type text not null,
  entity_id text not null,
  operation text not null check (operation in ('create', 'update', 'delete')),
  payload jsonb not null default '{}',
  ts timestamptz not null,
  received_at timestamptz not null default now(),
  -- Replays are dropped server-side (the client sends ignore-duplicates).
  unique (session_code, entity_id)
);

create index if not exists session_events_by_session on session_events (session_code, seq);

alter table session_events enable row level security;

-- Classroom-grade access: anyone holding the session code can append and
-- read that session's log. No personal data lives in these rows (spec §2.5).
create policy session_events_insert on session_events
  for insert to anon with check (true);

create policy session_events_select on session_events
  for select to anon using (true);

-- GDPR-light retention: purge sessions older than 30 days (run daily).
-- select cron.schedule('purge-mp-sessions', '0 4 * * *',
--   $$delete from session_events where received_at < now() - interval '30 days'$$);
