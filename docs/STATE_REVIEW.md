# Justurbanities — State Review & Roadmap

**As of:** 20 June 2026 · baseline commit `b7203fc` (Merge NPC quests + dialogues + Crisis Week data).

> **Note:** Two roadmap items below — **(A) the dynamic NPC director** and **(B) GameClock + time
> advancement**, plus **name/pronoun substitution in dialogue** — are implemented in the PR that adds
> this document. Treat their "not started" notes as the pre-PR baseline; the remaining open work is
> **(C) CrisisManager**, **(D) Maya directional sprites**, **(E) character art**, **(F) dialogue
> portraits**, and **(G) save versioning**.

---

## 1. Architecture map

### Boot & state flow (`src/app/App.ts:88–224`)
1. **Validation** — every bundled JSON (manifest, characters, animations, dialogues, quests, crises,
   playable, prologue) is zod-validated at boot (`App.ts:96–104`). On failure the loading screen halts
   and shows the schema error: a clean fail-fast barrier.
2. **Preload** — assets stream in parallel via `PreloadManager` (`App.ts:114`).
3. **Opening flow** — `OpeningScreens` drives title → prologue → character selection → name+pronoun
   customization (`App.ts:125–145`). New games call `GameState.startNewGame()` (resets to day 1,
   timePart 0, clears variables, `fragmentationGlobal: 5`); Continue restores from IndexedDB.
4. **Game start** — managers load their JSON, the active scene is entered, `GameLoop` starts, and
   `SyncEngine` begins background sync (`App.ts:216–223`).

### Render / update (`src/scenes/BaseScene.ts`)
`BaseScene` is the template for all scenes and is cleanly separated from rendering:
- **update(dt)** — player movement (keys/pointer), camera follow, autosave every 2s, proximity
  interaction (`BaseScene.ts:88–130`).
- **render()** — canvas clear, world drawn inside the camera transform, colour filter applied from
  `neighbourhoodVitality()` (`BaseScene.ts:132–141`): the "living fabric" visual feedback.
- **dialogue** — `DialogueRunner` binds `DialogueManager` + `DialogueUI`; interaction calls
  `dialogueRunner.run(dialogueId, speaker)`; choice effects flow through `EffectResolver`; progress
  events are logged + queued (`BaseScene.ts:184–193`).

### Managers & effect resolution
- **QuestManager** — status machine (`locked → available → active → completed`) + objectives, with
  snapshot/restore for saves. No scheduling/gating of its own.
- **DialogueManager** — reads JSON, tracks active dialogue/node, filters choices by conditions, applies
  entry effects exactly once (`DialogueManager.ts:68`). Stateless between dialogues.
- **EffectResolver** — evaluates `Condition`s (variable/resource/quest-state) and applies `Effect`s
  (`setVariable`, `addResource`, `startQuest`, `completeObjective`, `completeQuest`,
  `createProgressEvent`). Quest-state is the only cross-manager dependency. Condition checks are pure.
- **ResourceManager** — derives `neighbourhoodVitality` (0–100) from the 5 positive resources minus
  `fragmentationGlobal × 2`, maps to a discrete city state, applies CSS filters. Deterministic + tunable.

### Persistence & sync
`SerializableGameState` (`GameState.ts:5–26`) holds position, day, timePart, resources, variables, and
an attached quest snapshot. Saved locally to IndexedDB and queued for remote sync (fake adapter for now);
sync never blocks gameplay (`App.ts:85`). Autosave every 2s.

### Resource model
The five collective resources — `trust`, `care`, `commons`, `voice`, `resilience` — are the only
thread-weaving mechanics; rewards add +1/+2/+3. `fragmentationGlobal` is a pressure index that rises only
on quest shortcut paths. The whole city re-colours with vitality in real time.

---

## 2. Wired vs. not-yet-wired

### Wired (playable today)
- Title → opening flow, with name+pronoun capture saved to `GameState`.
- Two scenes: `CommunityCenterScene` (Anna + Ben) and `CrossroadsScene` (4 POIs).
- Two intro dialogues (`anna_intro`, `ben_intro`) → quest `P01`; reaching the bus hub completes `C01`.
- Vivarium loop: walk, talk, complete objectives, watch the city re-colour; live resource HUD.
- Directional sprite animation for Anna, Ben, and playables; Maya has real art.
- Save / sync / offline fully functional.

### Not-yet-wired: 18 NPC quests (`N01`–`N18`)
All 18 NPC quest dialogues are written and validated and sit in `quests.json` / `dialogues.json`, but
**no scene triggers them** — the blocking dependency is a **data-driven NPC placement/director system**
(NPCs hardcoded today, e.g. Anna at `(900, 620)` in `CommunityCenterScene.ts:20`). Each N-quest has an
**engage** path (multi-choice, resource rewards, completion) and a **shortcut** path (`+1`
`fragmentationGlobal`, immediate completion). `N03/N06/N08/N18` are gated on `trust`.

### Crisis Week: data ready, manager missing
`crises.json` (5 crises) + `Crisis.ts` define converging needs, buffer resources, and tiered conditions,
but there is **no `CrisisManager`**. Per `INTEGRATION_NPC_Quests.md` §5, a manager needs to: load crises,
evaluate `transformative → coordinated → reactive` at day-end, store the result in
`gameState.variables[resultVariable]`, emit a progress event, and feed the educational report. None of it
runs yet.

---

## 3. Risks / gaps / tech debt

**Critical (pre-PR baseline):**
1. No NPC director/scheduler → the 18 N-quests are unreachable. *(Addressed by this PR, item A.)*
2. No GameClock / time advancement → `day`/`timePart` never increment. *(Addressed by this PR, item B.)*
3. No crisis resolution → 5 designed crisis moments never evaluate. *(Open — item C.)*

**Important:**
4. Character asset coverage incomplete — Maya has real 4-dir art; most others have icon + portrait +
   single front idle only.
5. **Save versioning** — `SerializableGameState` has no `version` field; schema changes risk old-save
   breakage (partially mitigated by defaults in `GameState.restore()`).
6. Test-coverage holes — QuestManager is P01-focused; no tests for NPC scheduling, GameClock, or crises
   (the new code in this PR adds tests for the first two).
7. Validation gaps — sprite/animation frame IDs aren't checked against actual files at boot; missing
   assets fall back to an icon silently.
8. No portrait display in dialogue UI (design calls for speaker portraits with expressions).

**Lower priority:** minimal pronoun set, global (not per-layer) colour filter, no pause/settings/audio.

---

## 4. Prioritized roadmap (open work around this PR)

| Item | Size | Files (primary) |
|---|---|---|
| **C. CrisisManager** — load `crises.json`, resolve tiers at day-end, store result, feed report | M | `src/game/crisis/CrisisManager.ts` (new), `App.ts`, the GameClock day-end hook, `ReportGenerator`, tests |
| **D. Maya directional sprites** — complete the 4-dir `animations.json` entry + ensure the renderer uses directional names | S | `src/data/animations.json`, `src/engine/AnimatedSprite.ts`, tests |
| **E. Character art (priority NPCs)** — generate + integrate real art (Anna, Ben, Samir, Elena, Luca) via the proven pipeline | L (art-bound) | `public/assets/characters/*/`, `animations.json`, `asset_manifest.json` |
| **F. Dialogue portraits** — speaker portrait + expression in `DialogueUI`, optional `portraitExpression` on nodes | M | `src/ui/DialogueUI.ts`, `DialogueRunner.ts`, `types/Dialogue.ts`, `validation.ts`, `dialogues.json` |
| **G. Save versioning** — add `version` to saves + migration path + tests | S | `GameState.ts`, `SaveRepository.ts`, tests |

### Recommended sequence
- **Now (this PR):** A (NPC director) + B (GameClock) + name/pronoun substitution.
- **Next:** C (CrisisManager) — depends on B's day-end hook; unblocks the educational report's crisis
  narrative.
- **Then visual polish:** D (Maya sprites, 1 day) → F (dialogue portraits) → E (character art, art-bound,
  integrate as assets arrive).
- **Pre-release:** G (save versioning) + balancing of crisis thresholds and resource rates.

---

## 5. How the systems fit once C lands
1. Boot loads NpcDirector (A) + GameClock (B) + CrisisManager (C).
2. Scenes query the director for the NPCs present at the current scene/day/time/state; interaction opens
   `<speaker>_<id>`.
3. "Pass time" advances `timePart`; placement re-evaluates so the world visibly changes.
4. At day-end the clock invokes the CrisisManager, which resolves the day's crisis tier and records it.
5. On day 7 the educational report reads the crisis results + quest completion + resource state to narrate
   what the player built and what was missed.

*Detailed file references are inline above; the engine is modular and each new system follows the existing
manager + data-driven content + zod-validation pattern.*
