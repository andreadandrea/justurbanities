# Handoff — Justurbanities (resume in a new chat)

Quick context for continuing development in a fresh session.

## Repo & deploy
- **Working branch:** `claude/charming-fermi-xoi7hf` (also merged to `main`).
- **Live preview:** https://andreadandrea.github.io/justurbanities/ (auto-deploys on push to `main` via `.github/workflows/pages.yml`). Hard-refresh after deploy.
- **Stack:** TypeScript + Vite + Canvas 2D, offline-first (Dexie/IndexedDB), PWA. No framework (see `AGENTS.md`). `npm run dev` / `npm run build` / `npm test` (42 tests).

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

## Data in the repo, not yet wired
- **18 NPC quests `N01`–`N18`** appended to `src/data/quests.json`, with their
  dialogues (`<speaker>_<id>`) in `src/data/dialogues.json` (engage vs shortcut;
  shortcut raises `fragmentationGlobal`). Some engage choices are gated
  (`N03`,`N06`,`N08`,`N18`).
- **Crisis Week**: `src/data/crises.json` (5 crises) + `src/types/Crisis.ts` +
  `crisisFileSchema` (validated at boot). No `CrisisManager` yet — see
  `docs/game-design/INTEGRATION_NPC_Quests.md` for the proposed evaluation.
- These dialogues are **not yet triggered by any scene** — they need the NPC
  director (below) to place the NPCs and open `<speaker>_<id>` on interaction.

## In progress / next
1. **Day/time + dynamic NPCs** (the user's priority): `GameState.day`/`timePart` fields exist; still to build `GameClock`, time HUD + "pass time", and **data-driven NPC placement that varies by time / quest / story** (NPCs appear/relocate/leave). This is also what wires the N01–N18 dialogues into the world.
2. **Use name/pronoun in dialogue text** (accepted, not yet done).
3. **Directional sprite set for Maya** in the new art style (only a front pose exists, so in-world she still uses placeholder walk frames).
4. Art for the other characters.

## Asset pipeline (works)
Higgsfield is **not** available as an MCP connector in this environment, so the agent can't drive it. Proven workflow: user generates art (Higgsfield/ChatGPT, from the reference sheets in `public/assets/characters/<id>/references/`) → exports PNG → **puts it in a .zip** (inline-pasted images are NOT saved to disk; zips are) → uploads → the agent removes background (Pillow/scipy, multi-seed flood-fill avoiding hair), crops portrait/icon/full, saves to `public/assets/characters/<id>/{portraits,icons}/` with manifest-matching names, commits + deploys. No code change needed when filenames match the manifest.

## Notes
- Set the model explicitly when starting the new chat (the user prefers **Opus 4.8**).
- Playable roster + opening data: `src/data/playable.json`, `src/data/prologue.json`. Draft texts pending the official Dialogue Script.
