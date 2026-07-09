# Handoff — Justurbanities (resume in a new chat)

Quick context for continuing development in a fresh session.

## Repo & deploy
- **Branch:** `main` (feature branches merged with `--no-ff`, deleted on merge). **Everything is pushed** — origin/main is in sync.
- **Live preview:** https://andreadandrea.github.io/justurbanities/ (auto-deploys on push to `main`).
- **Stack:** TypeScript + Vite + Canvas 2D, offline-first (Dexie/IndexedDB), PWA. No framework (see `AGENTS.md`). `npm run dev` / `npm run build` / `npm test` (**300 tests**).

## Read first (for the next agent)
- `../DEV_PLAN.md` (in the design folder, NOT the repo) — ALL phases 0–9 complete; the content-debt session notes are at the bottom.
- `AGENTS.md` — hard technical rules.
- `docs/game-design/CORE_THEME.md`, `docs/game-design/GAMEPLAY_LOOP.md` — design pillars.
- `docs/specs/SPEC_Dual_Art_Style.md`, `docs/specs/SPEC_Multiplayer.md`.

## Done (this session, 2026-07-07 — content debt: ch.2–3 mission structure, all of Narrative v2 §4–§5)
- **Ch.2 M2 (M22) "The Map Is Not the Territory":** `BarrierMap` + one documentable barrier pin per district (`districts.json barriers`, zod layer enum). Voice +1 per pin (max 3); 3rd pin completes M22. ✳ Samir's ch.1 `fence_photographed` seeds the first pin without double Voice (`barrierMap.sync()` on dialogue end/boot).
- **Ch.2 M3 (M23) "Who Is Missing?":** cross 3 sources (Pablo/Gwen/Amin, placements retire after their note); hooks set `missing_group_elders/no_language/youth` + `missing_group` events (→N11/N16/N14); Samir hook + resolution at the Center.
- **Ch.2 M4 (M24) "Useful, Not Beautiful":** generic **district POIs** (condition-gated hotspots in `districts.json pois`, `SceneDeps.checkConditions`); Courtyard 17 assessment on 4 axes → `m24_*` verdict variables.
- **Ch.2 closing:** `StoryDirector.chapter2GateMet` (3 district first-visits + `listenBeforeFixingDone`) → ensemble scene → `chapter3_unlocked`, `ruben_curious` (2nd setter), `chapter_advanced`.
- **Ch.3 M1 (M31) "The First Promise":** Anna, 6 canon options mapped to registry promises (Tom/Ben/Lia/Gwen/Pablo/Sigrid); the choice activates exactly that promise; scoring rides `PromiseManager`.
- **Ch.3 M2 (M32) "Make It Usable":** minigame trigger moved off `sigrid_n05` onto `sigrid_m32`; `minigames.json` gained `questId`/`objectiveId` (panel completion completes the mission); M24 sheet pre-fills flagged axes in the panel (`ui.minigame.prefill/axes`). Gate: chapter 3 + N05 completed.
- **Ch.3 M3 (M33) "The Invitation Problem":** 3-step composer (tone/languages/channels → `m33_*`, `invitation_ready`); ✳ `invito_da_correggere` unlocks Samir signing (Voice +1).
- **Ch.3 M4 (M34) "Care Is Infrastructure":** 4 kit elements, Care +1 each (attendance flows through assembly `invitedConditions` care thresholds); N10 hook in text; N02 completed → Ben builds the ramp (`careKit_ramp_by_ben`).
- **Ch.3 M6 (M36) "Local Economy, Common Good":** Luca's limit — accept (+Commons, `shop_net_extended`) or push (`luca_pulled_back`).
- **Ch.3 closing:** `StoryDirector.chapter3GateMet` (3 of `CH3_INTERVENTIONS` = M31/M32/M33/M34/M36/E01/N08) → §5.9 complication (rumor/OFFER/CLOSURE/HEATWAVE+FLOOD seeds as `crisis_seed` events; Giorgia beat: Care −1 unless N10 done) → **`crisis_week_ready` now set by content** (debug button remains a shortcut).
- **✳ Elena's site visit as a played event:** `route_elena` pauses at the detour (`elena_route_stage="site_visit"`), only the Grey Yards bus runs early, the courtyard POI carries Ruben + the dilemma (`technical_grounded` avoids the PDF penalty); **Town Hall district scene** added (N03 + E01 knowledge table moved there, counter-hours barrier pin).
- **Kept-promise triggers:** `crises.json keepsPromises` — a transformative outcome keeps ACTIVE promises of its buffer quests (HEATWAVE→elders, RUMOR→info point, OFFER→repair day+common room, CLOSURE→bus info, FLOOD→crossing+climate prep). Never keeps a promise that wasn't made.
- **A11y:** HUD `aria-live="polite"` announcements for resource deltas and city-state transitions; `.visually-hidden` utility; checklist ticked.

## Next work (pick from here)
0. **Accounts + hardening v2: DONE and live-verified (2026-07-09).** Full loop verified against the EU project: signup (confirm-email OFF), cloud save push/pull/update, RLS (anon blocked, impersonation 403, non-existent session 403, owner-only erase). `player_saves.sql` and `session_events_v2.sql` both executed by Andrea. Teacher-owned sessions (create + two-click erase in FacilitatorPanel); MP sync requires sign-in (account id = player identity); privacy notice DRAFT at `public/privacy.html` (placeholders for the consortium to fill). **Left:** delete the TEST01 smoke row (`delete from session_events where session_code='TEST01';` — predates ownership, unreachable by owner-delete), schedule the pg_cron 30-day purge, delete the 2 smoke-test users from Authentication → Users when done testing, complete the privacy placeholders (project deliverable).
1. **Supabase: DONE (2026-07-07).** EU project `osuwbcwphhnfzluiyhqs` provisioned by Andrea; `session_events` table + RLS created; config committed in `.env.production` (publishable key — public by design). Live smoke test passed (insert/select/replay); replay bug fixed (`on_conflict` param). **Still open:** real 2-device classroom test (MP-3 AC on hardware) and the 30-day purge cron (`pg_cron` extension + the commented `cron.schedule` line in `docs/mp/session_events.sql`); a TEST01 smoke row is left in the table (harmless, purge will clear it).
2. **Content polish:** `promiseChildFriendlyMeeting` has no kept-trigger yet (natural candidate: an event held with `careKit_kids_space`); Ben's ramp line inside the assembly Phase 1 (read `careKit_ramp_by_ben`); Town Hall entry text is minimal connective tissue — replace if canon lands.
3. **Assembly/endings polish:** the final map re-colour shot (§7.8 "a mirror, not a victory screen") — currently a text epilogue in the panel.
4. **Art pipeline:** character portraits DONE (2026-07-07): the Higgsfield sets from `claude/character-art` (21 chars × 4 expressions + icons, generated 2026-06-21) merged into main, optimized 405→12 MB (512px + 256-color quantize). Still to produce from `docs/art/PROMPT_LIST.md`: key visual (Priority 1, the blocker), environments, resource icons, UI, walk-cycle sprites for NPCs, corporate_man assets, and the whole ANIMAL variant set. The old `claude/character-art` remote branch can be deleted (assets extracted; its code is stale).
5. **A11y open item:** DOM mirror for canvas hotspots (barrier pins/POIs are canvas-only interactables).

## Architecture notes for the next agent
- **Content is 100% data-driven** (zod at boot, loud failures). New since last session: `districts.json` carries `barriers` (M22 pins) and `pois` (condition-gated hotspots); `minigames.json` can link a quest objective; `crises.json` can keep promises.
- **StoryDirector** now drives ch.1 routes → assembly_v1 → **ch.2 closing gate** → **ch.3 closing gate** (constructor takes district ids + questStatus lookup).
- **Missions are quests** (ids M22–M36) started/completed by dialogue effects; mechanics beyond dialogue live in `BarrierMap` (M22) and `DistrictScene.recordChoice` (pin documenting), the rest is pure data.
- **Playable characters appear as mission-giver NPCs** at the Center (Samir/Maya/Luca placements) — same precedent as `elena_e01`.
- **Assembly:** attendance/invite rules in `assembly.json`; the care kit feeds them through Care resource thresholds.
- **Promises:** made by dialogue (`promiseX="active"`), kept by content or by transformative crisis outcomes, broken by deadline; `balancing.json` holds the scores.
- **DebugPanel is i18n-exempt** (dev tool): arm Crisis Week, open Assembly, export playtest, clear DB.

## Asset pipeline (works)
Prompt list ready in `docs/art/PROMPT_LIST.md` (priority: key visual → environments → icons/chromatic states → characters → UI; naming per Guida 04 §3). User generates art externally → **zip upload** (inline images are NOT saved to disk) → agent removes background, crops, commits. No code change needed when filenames match the manifest.

## Notes
- Session bootstrap and hard rules live in the design folder's `CLAUDE.md` (parent of this repo checkout).
- The user prefers the final session summary **in Italian**.
