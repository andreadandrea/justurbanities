-- Hardening v2 (2026-07-09, follows the accounts decision):
--  * class sessions are OWNED by the teacher (sessions table);
--  * session_events writable only by authenticated users AS THEMSELVES,
--    and only into sessions that exist;
--  * the owner erases a whole session (events + row) in one action.
-- Run in the SQL editor AFTER session_events.sql and player_saves.sql.

create table if not exists sessions (
  code text primary key check (char_length(code) = 6),
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table sessions enable row level security;

create policy sessions_select on sessions
  for select to authenticated using (true);

create policy sessions_insert on sessions
  for insert to authenticated with check (auth.uid() = owner_id);

create policy sessions_delete on sessions
  for delete to authenticated using (auth.uid() = owner_id);

-- Replace the classroom-grade anon policies with authenticated ones.
drop policy if exists session_events_insert on session_events;
drop policy if exists session_events_select on session_events;

create policy session_events_insert on session_events
  for insert to authenticated
  with check (
    auth.uid() = player_id
    and exists (select 1 from sessions where code = session_code)
  );

create policy session_events_select on session_events
  for select to authenticated using (true);

create policy session_events_owner_delete on session_events
  for delete to authenticated
  using (exists (select 1 from sessions s where s.code = session_code and s.owner_id = auth.uid()));
