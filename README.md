# Justurbanities: Eurbanities and Fragmentation

HTML5 / TypeScript / Canvas 2D / Offline-first starter repository for the educational civic adventure game **Justurbanities: Eurbanities and Fragmentation**.

This repository is prepared to be uploaded directly to GitHub and used with **Claude Code online**, Codex, Cursor or other coding agents.

## Technical direction

- HTML5
- TypeScript
- Canvas 2D custom renderer
- HTML/CSS overlay UI
- IndexedDB via Dexie
- Service Worker + Cache API
- Offline-first local save system
- Sync queue for remote database integration
- PWA-ready
- Capacitor/Tauri-ready later

## Important

This project intentionally does **not** use Phaser.

> **Note:** `public/eurbania_iso.html` is a standalone, online-only artefact
> (isometric city map preview). It is not part of the game build, is not
> offline-cached, and shares no code with `src/`.

## Quick start

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Current playable prototype

The current starter scene includes:

- responsive Canvas 2D scene;
- Maya placeholder player;
- Anna and Ben placeholder NPCs;
- keyboard and pointer movement;
- dialogue overlay;
- local autosave in IndexedDB;
- progress event logging;
- sync queue placeholder;
- Service Worker registration;
- generated placeholder assets for all loaded characters.

## Use with Claude Code online

1. Upload this repository to GitHub.
2. Open the repository in Claude Code online.
3. Ask Claude to read `AGENTS.md`.
4. Ask Claude to read `docs/CLAUDE_ONLINE_WORKFLOW.md`.
5. Assign one task at a time.

Recommended first task:

```text
Implement the DialogueManager + QuestManager integration described in docs/ai-agents/CODEX_IMPLEMENTATION_PROMPT.md.
```

## Repository structure

```text
public/
  assets/
src/
  app/
  engine/
  assets/
  game/
  storage/
  sync/
  ui/
  scenes/
  data/
docs/
  ai-agents/
  architecture/
  assets/
  database/
  dialogue/
  offline-sync/
  quest/
```
