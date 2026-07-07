# Handoff — Justurbanities (resume in a new chat)

Quick context for continuing development in a fresh session.

## Repo & deploy
- **Branch:** `main` (feature branches merged with `--no-ff`, deleted on merge).
- **⚠ 75+ local commits NOT pushed** — no GitHub credentials on this Mac (no `gh`, empty keychain, no SSH keys). First thing: authenticate (`brew install gh && gh auth login`) and `git push origin main`.
- **Live preview:** https://andreadandrea.github.io/justurbanities/ (auto-deploys on push to `main` — currently STALE, shows a pre-Phase-5 build).
- **Stack:** TypeScript + Vite + Canvas 2D, offline-first (Dexie/IndexedDB), PWA. No framework (see `AGENTS.md`). `npm run dev` / `npm run build` / `npm test` (**261 tests**).

## Read first (for the next agent)
- `../DEV_PLAN.md` (in the design folder, NOT the repo) — **ALL phases 0–9 are now complete**; next work comes from the list below or new direction from Andrea.
- `AGENTS.md` — hard technical rules.
- `docs/game-design/CORE_THEME.md`, `docs/game-design/GAMEPLAY_LOOP.md` — design pillars.
- `docs/specs/SPEC_Dual_Art_Style.md`, `docs/specs/SPEC_Multiplayer.md`.

## Done (this session, 2026-07-07 — Phases 7, 8, 9: the DEV_PLAN is COMPLETE)
- **7.1 Assembly engine:** `assembly.json` (19 attendees with groups + invite fallbacks, 10 stories/data, 3 conflicts, 20 measures × 10 categories, tuning) + `AssemblyEngine` (5 phases §7, whole state JSON-serialized in `variables.assemblyState`, resumes mid-assembly) + `AssemblyPanel` 🏛. Crisis Week completion raises `assembly_ready`; debug button too. Ending signals: `overpromise`, `assemblyCoverage`, `assemblyAbsentGroups`, `assemblyEvasions`, `assemblyTone`.
- **7.2 Endings engine:** `endings.json` (recursive all/any rules, ordered first-match, `fragile_progress` default; ≥2 absent groups blocks Thriving) + pure `computeEndingMetrics`/`resolveEnding`; `endingId` sticky in the save; epilogue (canon §9 EN/IT) in the assembly done view.
- **7.3 Report v2:** `buildReport` 2.0 — lists Who arrived / What changed / What was missed from progress_events + 3 debrief cards (Guida 06 §3) with evidence + ending; `printableReportHtml` (print → PDF offline) + 🖨 button.
- **8.1 MP-1:** `SessionModel` (6-char codes, pseudonymous players, TTL 30d) + `CityReducer` (deterministic total order + dedupe; commutative resource deltas; quests/crises first-event-wins with `questTakenByOther` ✳ hook; per-owner promises; last plan wins). `EffectResolver` now emits `resource_delta` and `quest_completed` — the single-player log is merge-safe.
- **8.2 MP-2:** `SupabaseRemoteApi` (fetch/PostgREST, no SDK, swappable `RemoteApiAdapter`); pure `chooseRemoteAdapter` (Supabase ONLY with `?mp=1` + joined + env config, else fake = zero network, test-enforced); `MpJoinPanel` join-by-code; `docs/mp/session_events.sql` (table+RLS+30d purge). **Needs real provisioning: Supabase EU project + `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` at build time.**
- **8.3 MP-3:** reducer collects the union of empathy maps; `applySharedCity` folds the city into a client (spec §3 split, idempotent, promises pre-scored). AC test: 2 devices → merge → assembly on A with B's stories/NPCs → plan back in the log.
- **8.4 MP-4:** `ClassReport` + `fetchSessionEvents` + `FacilitatorPanel` 🧑‍🏫 behind `?facilitator=1` (remote via `?session=CODE`, local log otherwise) + JSON class export.
- **9.1 Minigame:** reusable `AllocationMinigame` + `minigames.json` (zod, solvability-checked) + `MinigamePanel`; Modular Repair triggered by `sigrid_n05` engage (move to ch.3 M2 when that structure ships); Commons +1 per valid need via EffectResolver.
- **9.2 Accessibility:** dialogue hotkeys 1–9 + autofocus; typing guard in InputManager; `:focus-visible`; all font-sizes via `--font-scale` (⚙ 100/125/150%); high-contrast mode; `docs/accessibility/CHECKLIST.md` (open: DOM mirror for canvas hotspots, live regions).
- **9.3 Playtest:** `PlaytestInstrumentation` → `node_timing` (per-node ms + closing choice) and `day_resources` events; DialogueManager hooks; DebugPanel raw JSON export (M-E protocol).
- **9.4 Balancing:** `balancing.json` (starting resources, promise scoring, vitality formula/thresholds) — no gameplay threshold hardcoded; other knobs live in crises/endings/assembly/minigames json.

## Next work (no unchecked DEV_PLAN tasks — pick from here)
1. **Push to GitHub** (user action: credentials) → Pages redeploy.
2. **Supabase EU provisioning** + run `docs/mp/session_events.sql` + env vars → real 2-device test (MP-2/3 AC on hardware).
3. **Content debt:** ch.2–3 mission structure (M1–M4, M7 beyond dialogues: M2 map-barrier overlay, M3 invitation composer, M4 care kit — the care kit feeds assembly attendance and Ben's ramp line); Elena's site visit as a Grey Yards event; kept-promise triggers (crisis transformative outcomes are the natural candidates); Town Hall scene; `ruben_curious` setter; ch.3 content to set `crisis_week_ready` and later host the minigame trigger (M2 "Make It Usable").
4. **Assembly/endings polish:** the final map re-colour shot (§7.8 "a mirror, not a victory screen") — currently a text epilogue in the panel.
5. **Art pipeline:** prompt list ready in `docs/art/PROMPT_LIST.md`; zip upload flow works.
6. **A11y open items:** DOM mirror for canvas hotspots, aria-live resource announcements.

## Architecture notes for the next agent
- **Content is 100% data-driven** (zod at boot, loud failures): quests/dialogues/crises/schedule/promises/assembly/endings/minigames/balancing in `src/data/*.json`; every text is an i18n key (EN+IT full, 5 partner stubs synced by test).
- **Assembly:** `AssemblyEngine` state lives in `variables.assemblyState` (JSON string); scalar summaries feed endings. The panel only issues engine calls — rules live in the engine.
- **Endings:** pure functions; `endingId` computed once (sticky) when the pact is signed; thresholds in `endings.json`.
- **MP:** the event log IS the city. `EffectResolver` emits `resource_delta`/`quest_completed`; `reduceSharedCity` folds any order into the same state; `applySharedCity` respects the shared/personal split (spec §3). Adapter selection is pure (`chooseRemoteAdapter`) — flag off = zero network.
- **Instrumentation** flows through `progress_events` — report v2, class report and sync all read the same stream.
- **Balancing:** every gameplay number is in a json file; tests pin code↔sheet.
- **DebugPanel is i18n-exempt** (dev tool): arm Crisis Week, open Assembly, export playtest, clear DB.

## Asset pipeline (works)
Prompt list ready in `docs/art/PROMPT_LIST.md` (priority: key visual → environments → icons/chromatic states → characters → UI; naming per Guida 04 §3). User generates art externally → **zip upload** (inline images are NOT saved to disk) → agent removes background, crops, commits. No code change needed when filenames match the manifest.

## Notes
- Session bootstrap and hard rules live in the design folder's `CLAUDE.md` (parent of this repo checkout).
- The user prefers the final session summary **in Italian**.
