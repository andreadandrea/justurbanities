# SPEC — Multiplayer (Async Classroom Mode)
*v1.0 — 6 July 2026. (Riassunto IT: multiplayer asincrono per classi Erasmus+ — sessione condivisa con codice, ogni studente una route/quest sulla stessa città; risorse collettive aggregate, crisi e assemblea condivise; dashboard facilitatore; il single player resta 100% offline. Il realtime NON è in scope.)*

## 1. Scope

- **In scope:** shared-city async multiplayer for a classroom (2–30 players + 1 facilitator), joinable by session code, playable across devices and days. Local pass-and-play (5 routes on one device) — already implicit in ch.1 — stays the zero-network option.
- **Out of scope (explicit):** realtime co-presence, chat, accounts, matchmaking. The game must never *require* network in single player (offline-first is untouchable).

## 2. Architecture — event-sourced shared city

Build on what exists: `progress_events` (Dexie) + `sync_queue` + `RemoteApiClient` (fake/REST placeholder).

1. **Session** = append-only **event log** on the server + deterministic reducer on clients. Client emits events (choice made, quest completed, promise made/kept, crisis response, plan proposal); server orders them (server timestamp); every client folds the log into city state.
2. **Merge safety by construction:** collective resources are **commutative increments** (+1/+2/−1 — order-independent); quest completion is idempotent (first event wins, replays ignored); promises/plan items are per-player-owned (no write conflicts). No locks needed for async play.
3. **Time model:** the session advances in **windows** (day/timePart) opened by the facilitator or by a schedule ("day 2 opens Wednesday"). Players act inside the window at their own pace — arriving late is (thematically and mechanically) part of the game.
4. **Backend: Supabase, EU region** (default; already the named placeholder in repo docs) — Postgres table `session_events(session_id, seq, player_id, type, payload, ts)` + Realtime channel for cheap "new events" notifications + Row Level Security by session code. The adapter interface stays swappable (any REST backend can replace it). Feature-flagged (`?mp=1`) until stable.
5. **Identity & privacy (GDPR-light):** ~~no accounts, no email. Pseudonymous display name + device key per session~~ — **superseded 2026-07-07 (ratified by Andrea): full accounts for every player** (Supabase Auth, email+password, plain fetch). Accounts give a recallable identity (MP player_id = auth user id), the personal dashboard and cross-device resume (`player_saves` snapshot, RLS per user). The pseudonymous join stays as fallback for signed-out players; the single-player game NEVER requires an account (offline-first untouched). GDPR consequence: player emails are personal data — privacy notice and (for minors) consent handling become a project deliverable. 6-char session codes; sessions expire (default 30 days) and are erasable by the facilitator in one action.

## 3. What is shared vs personal

| Shared (city) | Personal (player) |
|---|---|
| 5 collective resources, `frag`, district vitality/colours | Personal resources (time, energy, stress), inventory, position |
| Quest completion states N01–N18 / P / C / E01 | Own route progress and choices in ch.1 |
| Crisis tiers reached (days 1–5) | Own empathy maps (contributed to assembly when chosen) |
| Promises board (owner visible) | Art-style preference, language, settings |
| Assembly: proposals, plan, commitments | Own report page (personal layer of the 3 lists) |

Design consequence: two players can attempt the same NPC quest; the **first completion event** counts for the city, the second player gets a graceful variant line ("someone got here before you — the neighbourhood remembers both of you": no wasted play, small Trust echo). ✳

## 4. Phases (= DEV_PLAN Phase 8)

- **MP-1 Session model (no server):** session/player entities, event-log reducer over `progress_events`, deterministic merge — proven with two local profiles in tests.
- **MP-2 Sync adapter:** Supabase adapter implementing the existing `RemoteApiClient` interface; join-by-code UI; offline queue drains on reconnect (the `sync_queue` already exists for this).
- **MP-3 Shared city:** aggregated resources/crises/assembly; assembly Phase 2 pulls stories from ALL players; plan builder becomes collaborative (proposals per player, facilitator-run vote).
- **MP-4 Facilitator view:** read-only dashboard (who arrived, resources timeline, promises, crisis tiers) + class report export (the educational deliverable).

## 5. Acceptance criteria

Two-device async session completes prologue→ch.1→first assembly with correctly merged city state; killing the network mid-session loses nothing (queue drains later); single-player build with `mp` flag off has zero network calls (test-enforced); facilitator can export the class report; session data erasable.
