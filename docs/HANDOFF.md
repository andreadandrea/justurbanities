# Handoff — Justurbanities (resume in a new chat)

Quick context for continuing development in a fresh session.

## Repo & deploy
- **Working branch:** `claude/eloquent-sagan-tvs9ez` (latest day/time + dynamic NPCs slice). Previous: `claude/charming-fermi-xoi7hf` (merged to `main`).
- **Live preview:** https://andreadandrea.github.io/justurbanities/ (auto-deploys on push to `main` via `.github/workflows/pages.yml`). Hard-refresh after deploy.
- **Stack:** TypeScript + Vite + Canvas 2D, offline-first (Dexie/IndexedDB), PWA. No framework (see `AGENTS.md`). `npm run dev` / `npm run build` / `npm test` (58 tests).

## Read first (for the next agent)
- `AGENTS.md` — hard technical rules.
- `docs/game-design/CORE_THEME.md` — Poly Crisis perceived as **Fragmentation**.
- `docs/game-design/GAMEPLAY_LOOP.md` — Vivarium-inspired loop, 4 pillars, phased plan, POV.

## Done
- Engine + data-driven dialogues/quests (zod-validated), offline save, sync (fake adapter), debug panel, educational report.
- **Opening flow:** title → narrative prologue → character selection → customization (name+pronoun for Custom; presets are fixed identities).
- **3/4 follow camera** in a world larger than the viewport + **animated directional sprites** (walk/idle ×4 dir) for playables.
- **Living fabric:** the whole city re-colours with derived **Neighbourhood Vitality**; resource HUD. Vivid palette.
- **Maya real art** integrated (portrait, icon, full figure) — generated externally, background-removed and wired in.
- **Day/time cycle + dynamic NPCs** (Gameplay Loop pillars 2–3): `GameClock` (day + morning/afternoon/evening) drives a top-right **time HUD with a "Pass time" button**; an `advanceTime` dialogue/quest effect can pass time too. **Data-driven NPC placement** (`src/data/npcs.json` + `NpcScheduler`) makes NPCs appear / relocate / leave by **time, day, quest state and story variables** — e.g. Anna leaves in the evening, Samir is at the Crossroads in the morning and the Community Center after his shift, Luca holds the corner in the afternoon. Scenes rebuild their NPC set reactively (cheap per-frame signature check). All persisted in the save.

## In progress / next
1. **Quest loop v1** (Gameplay Loop phase 4): a small data-driven quest board of neighbour tasks with resource rewards feeding Vitality. NPC placements can already gate on `questState`, so quests can now move people around.
2. **Assembly as a dated deadline** (phase 3 tail): use `GameClock.day` for a real deadline; `notedAssemblyTiming` flag already set by Samir.
3. **Use name/pronoun in dialogue text** (accepted, not yet done).
4. **Directional sprite set for Maya** in the new art style (only a front pose exists, so in-world she still uses placeholder walk frames). Other NPCs render from their `:icon` when no walk frames exist.
5. Art for the other characters.

## Asset pipeline (works)
Higgsfield is **not** available as an MCP connector in this environment, so the agent can't drive it. Proven workflow: user generates art (Higgsfield/ChatGPT, from the reference sheets in `public/assets/characters/<id>/references/`) → exports PNG → **puts it in a .zip** (inline-pasted images are NOT saved to disk; zips are) → uploads → the agent removes background (Pillow/scipy, multi-seed flood-fill avoiding hair), crops portrait/icon/full, saves to `public/assets/characters/<id>/{portraits,icons}/` with manifest-matching names, commits + deploys. No code change needed when filenames match the manifest.

## Notes
- Set the model explicitly when starting the new chat (the user prefers **Opus 4.8**).
- Playable roster + opening data: `src/data/playable.json`, `src/data/prologue.json`. Draft texts pending the official Dialogue Script.
