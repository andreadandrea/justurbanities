# Handoff — Justurbanities (resume in a new chat)

Quick context for continuing development in a fresh session.

## Repo & deploy
- **Branch:** `main` (feature branches merged with `--no-ff`, then deleted-on-merge style).
- **⚠ 30+ local commits NOT pushed** — no GitHub credentials on this Mac (no `gh`, empty keychain, no SSH keys). First thing: authenticate (`brew install gh && gh auth login`) and `git push origin main`.
- **Live preview:** https://andreadandrea.github.io/justurbanities/ (auto-deploys on push to `main`).
- **Stack:** TypeScript + Vite + Canvas 2D, offline-first (Dexie/IndexedDB), PWA. No framework (see `AGENTS.md`). `npm run dev` / `npm run build` / `npm test` (**127 tests**).

## Read first (for the next agent)
- `../DEV_PLAN.md` (in the design folder, NOT the repo) — the execution backlog; work top-down from the first `[ ]`.
- `AGENTS.md` — hard technical rules.
- `docs/game-design/CORE_THEME.md`, `docs/game-design/GAMEPLAY_LOOP.md` — design pillars.
- `docs/specs/SPEC_Dual_Art_Style.md`, `docs/specs/SPEC_Multiplayer.md` — core requirements for Phases 5 and 8.

## Done (this session, 2026-07-06 — Phases 0–4 of DEV_PLAN complete)
- **Phase 0:** ratified data fixes (N05→CRISIS_OFFER, RUMOR buffer→N07, voice speakers, corporate_man), canon taglines, cleanup (dynamic scene title, restore() defaults), `{playerName}`/pronoun interpolation.
- **Phase 1:** `GameClock` (day/part cycle, dayEnded/dayStarted/timeAdvanced hooks) + TimeHud with "Pass time".
- **Phase 2:** `schedule.json` + `NpcDirector` (first-matching-placement-wins fallbacks; refresh on enter/clock/choice). **All 18 NPC quests live in-world** with canon EN texts (§8). Simulation test completes every N01–N18.
- **Phase 3:** i18n — `I18n` engine (EN fallback, live switch, missing-key report in DebugPanel), OptionsPanel (⚙) persisted in Dexie `settings` (schema v2), **ALL strings extracted to `content.*`/`ui.*` keys** (EN+IT 100%, 5 partner stubs synced by test), translation kit (`npm run i18n:export` / `i18n:import`, CSV, placeholder validation).
- **Phase 4:** `CrisisManager` (tier resolution + per-tier data effects), `CrisisWeek` orchestrator (armed by `crisis_week_ready` flag → starts next morning; announcement + tier outcome scenes, EN+IT canon §6 texts; saves resume mid-week; DebugPanel has an "Arm Crisis Week" button until ch.3 content sets the flag), `PromiseManager` + LogbookPanel 📖 (8 canon promises, kept +3 Trust / broken −2 Trust +1 frag).

## Next task
**Phase 5 — Dual art style** (see `docs/specs/SPEC_Dual_Art_Style.md`): 5.1 variant-aware asset manifest & loader (`realistic`/`animal` path segment, fallback chain, zod). The Dexie `settings` table and OptionsPanel are already in place for 5.2.

## Architecture notes for the next agent
- **Content is 100% data-driven:** quests/dialogues/crises/schedule/promises in `src/data/*.json` (zod at boot, loud failures); every text is an i18n key resolved by `DialogueUI`/`OpeningScreens`/etc. Changing dialogue = edit `src/locales/{en,it}.json` + structure in `dialogues.json`. Guard tests fail on hardcoded strings.
- **Time:** nothing moves without `GameClock.advance()` (Pass time button or future story beats).
- **NPCs:** `schedule.json` placements (scene × timeParts × conditions); first match wins → put quest offers before intro fallbacks.
- **Crisis Week:** arm via `crisis_week_ready` variable (ch.3 content should set it in Phase 6); all bookkeeping in `GameState.variables`.
- **Known content gaps** (Phase 6): `ruben_curious` (N06 engage gate) and `commission_started` (N08 gate) are set by no dialogue yet — Elena's ch.1 route will set `commission_started`; kept-promise triggers not yet wired (crisis transformative outcomes are natural candidates).
- **DebugPanel is i18n-exempt** (dev tool). It shows the i18n missing-key report.

## Asset pipeline (works)
Prompt list ready in `docs/art/PROMPT_LIST.md` (priority: key visual → environments → icons/chromatic states → characters → UI; naming per Guida 04 §3). User generates art externally → **zip upload** (inline images are NOT saved to disk) → agent removes background, crops, commits. No code change needed when filenames match the manifest.

## Notes
- Session bootstrap and hard rules live in the design folder's `CLAUDE.md` (parent of this repo checkout).
- The user prefers the final session summary **in Italian**.
