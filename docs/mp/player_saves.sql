-- Accounts (ratified 2026-07-07, supersedes SPEC_Multiplayer §2.5's
-- "no accounts"): cross-device resume — one save snapshot per user.
-- Run AFTER enabling Supabase Auth (email provider).
-- Classroom tip: Authentication → Sign In / Up → disable "Confirm email"
-- so students can register and play in the same lesson.

create table if not exists player_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table player_saves enable row level security;

-- Each player reads and writes ONLY their own save.
create policy player_saves_select on player_saves
  for select to authenticated using (auth.uid() = user_id);

create policy player_saves_insert on player_saves
  for insert to authenticated with check (auth.uid() = user_id);

create policy player_saves_update on player_saves
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
