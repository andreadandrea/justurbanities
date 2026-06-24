# NPC Movement & Interaction Spec (Vivarium-style)

> **Target file location in repo:** `docs/gameplay/NPC_MOVEMENT_INTERACTION.md`
> **Audience:** Claude Code (and other coding agents) working on `andreadandrea/justurbanities`.
> **Read first:** `AGENTS.md`, `docs/CLAUDE_ONLINE_WORKFLOW.md`, `docs/README_START_HERE.md`.

---

## 1. Purpose

Define how the player moves through the world and interacts with NPCs, using **Vivarium** (Studio Meadowflower) as the reference for *feel*: free 2D exploration of a small, cozy world; proximity-based NPC conversations; NPCs with branching, evolving storylines.

This spec is **mechanics only**. It must respect the existing technical direction in `AGENTS.md`:

- TypeScript (strict), Canvas 2D custom renderer, HTML/CSS overlay UI.
- Narrative content is **JSON-driven**. No dialogue text hardcoded in scene classes.
- Rendering must stay separate from game logic.
- Offline-first; nothing here may block on network.
- **Do not** introduce Phaser, Unity, Godot, or any heavy game framework.

---

## 2. What to replicate from Vivarium (and what NOT to)

### Adopt
- Free movement of the player in a 2D navigable space (not just dialogue screens).
- **Proximity interaction**: walk near an NPC → an interaction prompt appears → press a key / tap to talk.
- NPCs with persistent state that evolves across game phases (their available dialogue/quests change).
- Non-linear, choice-driven narrative with multiple outcomes.
- Calm, "cozy", story-rich pacing.

### Do NOT implement (out of scope for this educational civic game)
- Real-world calendar sync.
- Cooking, gardening, crafting, decorating.
- Collectibles (stickers, vinyl, etc.).
- Time-management / resource-management loops.

---

## 3. Conceptual model

```
World (district)
 ├── walkable area (bounds + optional obstacles)
 ├── Player entity (position, velocity, facing)
 └── NPC entities[]
      ├── id (matches Character List / NPC Storylines)
      ├── position
      ├── interactionRadius
      ├── currentState (drives which dialogue/quest is active)
      └── dialogueRef (JSON node id, NOT inline text)
```

- The **Canvas** draws the world, player, and NPCs.
- The **HTML overlay** draws the interaction prompt and the dialogue box.
- **Game logic** (movement, proximity checks, state) lives outside the renderer and is fed to it each frame.

---

## 4. Data contracts (JSON-driven)

All content must be data-driven and validated with **zod** (per AGENTS.md priority #5). Define/extend these schemas; do not hardcode.

### 4.1 NPC definition — `src/data/npcs/<district>.json`
```jsonc
{
  "npcs": [
    {
      "id": "anna",                 // lowercase, matches manifest + Character List
      "displayNameKey": "npc.anna.name",  // i18n key, never a literal string
      "spawn": { "x": 320, "y": 180 },
      "interactionRadius": 48,      // px in world units
      "portrait": "assets/char/anna.png",
      "states": ["intro", "post_crossing", "resolved"],
      "defaultState": "intro",
      "dialogueByState": {
        "intro": "anna_intro",
        "post_crossing": "anna_post_crossing",
        "resolved": "anna_resolved"
      },
      "questId": "anna_listening"   // optional, links to QuestManager
    }
  ]
}
```

### 4.2 Dialogue node — `src/data/dialogue/<id>.json`
Reuse the existing dialogue JSON format if one already exists; otherwise:
```jsonc
{
  "id": "anna_intro",
  "lines": [
    { "speaker": "anna", "textKey": "dlg.anna_intro.1" },
    { "speaker": "player", "textKey": "dlg.anna_intro.2" }
  ],
  "choices": [
    { "textKey": "dlg.anna_intro.choiceA", "goto": "anna_intro_a", "setState": null },
    { "textKey": "dlg.anna_intro.choiceB", "goto": "anna_intro_b", "setState": null }
  ],
  "onComplete": { "npcId": "anna", "setState": "post_crossing", "questEvent": "anna_met" }
}
```

> **i18n rule:** every player-visible string is a key resolved at runtime against locale files. Never put IT/EN text directly in these JSON files. Keep `it` + `en` complete; `de/hu/pl/sv/ro` may stay as EN stubs until partner translations arrive.

---

## 5. Player movement

- Input: keyboard (WASD + arrows) and pointer (click/tap to set a move target). Both already exist in the starter — extend, don't replace.
- Movement is continuous on the walkable plane, clamped to world bounds.
- Track `facing` (last non-zero movement direction) — needed for the interaction prompt and future sprite direction.
- Keep movement in a `MovementSystem` (or equivalent) separate from rendering. The renderer only reads the resulting positions.

**Acceptance:** player can roam the district smoothly with keyboard and pointer; cannot leave bounds; movement logic is unit-testable without a canvas.

---

## 6. Proximity interaction (the core Vivarium feel)

### 6.1 Detection
Each frame, compute distance from player to each NPC. The **nearest NPC within its `interactionRadius`** becomes the `activeInteractable`. Ties broken by smallest distance.

### 6.2 Prompt
When an `activeInteractable` exists and no dialogue is open, the HTML overlay shows a small prompt near that NPC (e.g. "Press E / Tap to talk"). The prompt hides when the player leaves the radius or dialogue opens.

### 6.3 Trigger
Pressing the interact key (E / Enter) or tapping the prompt opens the dialogue for `activeInteractable`, resolved as:
```
npc.dialogueByState[npc.currentState]  →  dialogue node id  →  DialogueManager
```

### 6.4 Dialogue handoff
- `DialogueManager` (AGENTS.md priority #2) owns the dialogue lifecycle: render lines, present choices, return the chosen branch.
- Movement input is suspended while dialogue is open (player can't walk away mid-line). Re-enable on close.
- On `onComplete`, apply `setState` to the NPC and emit any `questEvent` to `QuestManager` (priority #3), then persist (section 8).

**Acceptance:** walking near Anna shows a prompt; pressing E opens her current-state dialogue; choices branch correctly; finishing advances her state and the prompt reflects the new state next time.

---

## 7. NPC state & evolving storylines

- `currentState` is the single source of truth for which dialogue/quest an NPC currently offers.
- State transitions happen only through `onComplete.setState` or explicit `QuestManager` events — never ad hoc inside the renderer or scene class.
- States must map to the storylines in `NPC Needs, Quests and Storylines`. Use the same NPC ids as `Character List` (resolve the existing **"Mrs. Viveca" vs "Viveca"** mismatch by picking one canonical id, lowercase, e.g. `viveca`).

**Acceptance:** an NPC shows different dialogue before vs. after a crossing/turning point, driven purely by `currentState`.

---

## 8. Persistence (offline-first)

Per AGENTS.md: save locally first, sync later, never block gameplay.

Persist via the existing IndexedDB/Dexie layer:
- player position + current district,
- each NPC's `currentState`,
- quest state from `QuestManager`,
- a progress event log entry per interaction (already scaffolded in the starter).

Remote sync goes through the existing **sync queue** and must be fire-and-forget.

**Acceptance:** reload the page → player and all NPC states restore from local save with no network.

---

## 9. Scope boundaries for this task

**In scope:** movement extension, proximity detection, interaction prompt, dialogue trigger + handoff, NPC state transitions, local persistence of the above, zod schemas for NPC + dialogue JSON.

**Out of scope (separate tasks):** the Crossroads/Crossing scene assembly, the foresight/scenario mini-game, the educational end report, multiplayer, approved background art (CSS placeholders stay for now).

---

## 10. Suggested implementation order

1. Define + validate the NPC JSON schema (zod); load one district's NPCs from data.
2. Extend `MovementSystem` with `facing` and pointer-target movement; add unit tests.
3. Add `ProximitySystem` → computes `activeInteractable` each frame.
4. Add the HTML overlay interaction prompt bound to `activeInteractable`.
5. Wire interact key/tap → `DialogueManager.open(dialogueId)`.
6. Implement `onComplete` → NPC `setState` + `QuestManager` event.
7. Persist player + NPC states via Dexie; restore on load.
8. Add a debug panel toggle to inspect `activeInteractable` and NPC states (AGENTS.md priority #6).

---

## 11. Agent working rules (from AGENTS.md)

Before editing: summarize planned changes, list files to modify, avoid unrelated rewrites.
After editing: run `npm run build`, summarize files changed, what works, and known limitations.

**First action:** read `AGENTS.md` and the four docs it lists, confirm whether a `DialogueManager` stub already exists, then propose the file list for step 1 before writing code.
