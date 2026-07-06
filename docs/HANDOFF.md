# Handoff — Justurbanities (resume in a new chat)

Quick context for continuing development in a fresh session.

## Repo & deploy
- **Branch:** `main` (feature branches merged with `--no-ff`, then deleted-on-merge style).
- **⚠ 55+ local commits NOT pushed** — no GitHub credentials on this Mac (no `gh`, empty keychain, no SSH keys). First thing: authenticate (`brew install gh && gh auth login`) and `git push origin main`.
- **Live preview:** https://andreadandrea.github.io/justurbanities/ (auto-deploys on push to `main`).
- **Stack:** TypeScript + Vite + Canvas 2D, offline-first (Dexie/IndexedDB), PWA. No framework (see `AGENTS.md`). `npm run dev` / `npm run build` / `npm test` (**172 tests**).

## Read first (for the next agent)
- `../DEV_PLAN.md` (in the design folder, NOT the repo) — the execution backlog; work top-down from the first `[ ]`.
- `AGENTS.md` — hard technical rules.
- `docs/game-design/CORE_THEME.md`, `docs/game-design/GAMEPLAY_LOOP.md` — design pillars.
- `docs/specs/SPEC_Dual_Art_Style.md`, `docs/specs/SPEC_Multiplayer.md` — core requirements for Phases 5 and 8.

## Done (this session, 2026-07-06 — Phases 0–6 of DEV_PLAN complete, 172 tests)
- **Phase 6.3:** the 6 outer district scenes (districts.json + generic DistrictScene, §4.5 entry texts, bus stops from the Crossroads unlocked with ch.2); 13 NPC placements moved to canonical districts.
- **Phase 6.4:** N01 is the real Mission 1 (3 interviews / 3 postures → empathy maps in variables, reusable in ch.5; Anna's resolution closes it); quest **E01** "Experts of Everyday Life" (knowledge table gated on 3 maps, registry note in meta).
- **Phase 6.5:** district-level vitality — districtVitality = global fabric + bonus per completed anchored quest (anchors derived from schedule.json); every scene colours by ITS vitality; §5.8 first-colour-returns reproducible in test.

## Done (earlier — Phases 5 + 6.1–6.2)
- **Phase 5:** dual art style — variant-aware loader (flat layout = realistic, `animal/` subfolder; hard fallback chain; `npm run assets:report`), art-style toggle (⚙ + save snapshot + Dexie), dialogue speaker portraits, per-variant offline packs, 110 generated animal placeholders (sepia + ears + paw badge).
- **Phase 6.1:** Prologue v2 (§2) — Anna's opening, voices round, map glitch, invitation; seed flags incl. `ruben_curious`; all 18 chapter placements gated on `prologue_complete`.
- **Phase 6.2:** Chapter 1 five routes (§3) + first assembly — StoryDirector (auto-runs route post-prologue, assembly post-route), Samir's PHYSICAL fence (BaseScene blockers) in the Crossroads, `elena_saw_it`/`commission_started` seeds, assembly_v1 branches on outcomes, completes P02.

## Done (earlier in the session — Phases 0–4)
- **Phase 0:** ratified data fixes (N05→CRISIS_OFFER, RUMOR buffer→N07, voice speakers, corporate_man), canon taglines, cleanup (dynamic scene title, restore() defaults), `{playerName}`/pronoun interpolation.
- **Phase 1:** `GameClock` (day/part cycle, dayEnded/dayStarted/timeAdvanced hooks) + TimeHud with "Pass time".
- **Phase 2:** `schedule.json` + `NpcDirector` (first-matching-placement-wins fallbacks; refresh on enter/clock/choice). **All 18 NPC quests live in-world** with canon EN texts (§8). Simulation test completes every N01–N18.
- **Phase 3:** i18n — `I18n` engine (EN fallback, live switch, missing-key report in DebugPanel), OptionsPanel (⚙) persisted in Dexie `settings` (schema v2), **ALL strings extracted to `content.*`/`ui.*` keys** (EN+IT 100%, 5 partner stubs synced by test), translation kit (`npm run i18n:export` / `i18n:import`, CSV, placeholder validation).
- **Phase 4:** `CrisisManager` (tier resolution + per-tier data effects), `CrisisWeek` orchestrator (armed by `crisis_week_ready` flag → starts next morning; announcement + tier outcome scenes, EN+IT canon §6 texts; saves resume mid-week; DebugPanel has an "Arm Crisis Week" button until ch.3 content sets the flag), `PromiseManager` + LogbookPanel 📖 (8 canon promises, kept +3 Trust / broken −2 Trust +1 frag).

## Next task
**Phase 7 — Finale & endings**: 7.1 assembly engine (5 phases from §7: presence calc, stories, conflict table, plan builder 10 categories, commitments with owner/date/verify + overpromise flag), 7.2 endings engine (6 endings, §9 conditions as tunable data), 7.3 report v2. The empathy maps (variables `empathyMap_*`), promises, crisis resolutions and who_is_in_the_room progress events are all in place to feed it.

## Content debt queued for polish
- Mission mechanics beyond dialogues: M2 map-barrier overlay, M3 invitation composer, M4 care kit (need small UI systems).
- Elena's site visit as an in-world Grey Yards event (currently a route beat).
- "Who is in the room" visual composition (currently a progress event).
- Kept-promise triggers (crisis transformative outcomes are the natural candidates).
- Town Hall scene (Alexandria placeholder at the hub).

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
