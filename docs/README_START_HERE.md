# Start Here

## What this repository is

This is the complete GitHub-ready starter repository for **Justurbanities: Eurbanities and Fragmentation**.

It includes:

- HTML5 + TypeScript starter project;
- Canvas 2D custom renderer;
- offline-first local database setup;
- sync queue placeholder;
- Service Worker and PWA manifest;
- runtime placeholder assets generated from character reference sheets;
- character data;
- dialogue and quest specs;
- AI agent instructions for Claude Code online and Codex.

## Run locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Controls

- WASD / arrow keys: move Maya
- click/tap: move toward pointer
- space/enter/click near Anna or Ben: open dialogue

## Current limitation

The project currently includes DialogueManager and QuestManager source files/specs, but the starter scene still contains hardcoded dialogue.

The first Claude Code task is to integrate the managers into `CommunityCenterScene`.
