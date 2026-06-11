# AGENTS.md

## Project identity

Project: **Justurbanities: Eurbanities and Fragmentation**

Type: educational civic adventure game.

Target: web-first, offline-first, cross-device game application.

## Mandatory technical direction

Use:

- TypeScript
- HTML5
- Canvas 2D custom renderer
- HTML/CSS overlay UI
- IndexedDB through Dexie
- Service Worker + Cache API
- local-first saves
- sync queue for remote persistence

Do **not** use:

- Phaser
- Unity
- Godot
- React Native
- heavy game frameworks

## Architecture principles

1. Rendering must be separate from game logic.
2. Narrative content must be JSON-driven.
3. Save locally before remote sync.
4. Remote sync must never block gameplay.
5. Game must still work offline.
6. UI overlays should remain accessible HTML.
7. Canvas should draw the world, not complex text UI.
8. Use strict TypeScript.
9. Keep assets and data lower-case and manifest-driven.
10. Do not hardcode dialogue text in scene classes after DialogueManager is integrated.

## Main implementation priorities

1. Stabilize starter project.
2. Integrate DialogueManager.
3. Integrate QuestManager.
4. Persist quest state in local saves.
5. Add JSON validation with zod.
6. Add local debug panel.
7. Add remote API adapter.
8. Add offline asset cache controls.
9. Add Crossroads scene.
10. Add educational report generation.

## First task for coding agents

Read:

```text
docs/CLAUDE_ONLINE_WORKFLOW.md
docs/README_START_HERE.md
docs/NEXT_DEVELOPMENT_TASKS.md
docs/ai-agents/CODEX_IMPLEMENTATION_PROMPT.md
```

Then implement DialogueManager + QuestManager integration.

## Rules for AI agents

Before editing:

- summarize planned changes;
- list files to modify;
- avoid unrelated rewrites.

After editing:

- run `npm run build`;
- summarize files changed;
- summarize what works;
- summarize known limitations.
