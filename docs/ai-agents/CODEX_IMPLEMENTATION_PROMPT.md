# Codex / Claude Code Implementation Prompt

Read first:

```text
AGENTS.md
docs/README_START_HERE.md
docs/NEXT_DEVELOPMENT_TASKS.md
docs/dialogue/DIALOGUE_MANAGER_SPEC.md
docs/quest/QUEST_MANAGER_SPEC.md
```

## Task

Implement DialogueManager + QuestManager integration.

## Requirements

- Load `src/data/dialogues.json`.
- Load `src/data/quests.json`.
- Remove hardcoded dialogue text from `CommunityCenterScene`.
- Use `DialogueManager.start("anna_intro")` for Anna.
- Use `DialogueManager.start("ben_intro")` for Ben.
- Use `QuestManager`.
- Use `EffectResolver`.
- Apply dialogue effects to variables, resources and quest state.
- Persist quest state in local save.
- Keep progress event logging.
- Keep sync queue entries for progress events.
- Keep app working offline.
- Do not introduce Phaser.

## Files likely modified

```text
src/app/App.ts
src/scenes/CommunityCenterScene.ts
src/game/GameState.ts
src/storage/LocalDatabase.ts
src/storage/SaveRepository.ts
```

## Acceptance criteria

- `npm run build` passes.
- Anna dialogue comes from JSON.
- Ben dialogue comes from JSON.
- P01 quest starts after talking to Anna.
- P01 objectives update after talking to Anna and Ben.
- The local save persists quest state.
- No Phaser dependency added.
