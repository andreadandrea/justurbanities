# Claude Code Online Workflow

## Step 1 — Upload to GitHub

Create a new GitHub repository, for example:

```text
justurbanities-web
```

Upload the full contents of this package.

Commit message:

```text
Initial Justurbanities HTML5 Canvas offline-first starter
```

## Step 2 — Open in Claude Code online

Ask Claude Code:

```text
Read AGENTS.md first.
Then read docs/README_START_HERE.md and docs/NEXT_DEVELOPMENT_TASKS.md.
Do not use Phaser.
Before editing, summarize the files you plan to modify.
```

## Step 3 — First implementation task

Use this prompt:

```text
Implement the DialogueManager + QuestManager integration described in docs/ai-agents/CODEX_IMPLEMENTATION_PROMPT.md.

Requirements:
- load src/data/dialogues.json
- load src/data/quests.json
- remove hardcoded dialogue text from CommunityCenterScene
- apply dialogue effects to variables, resources and quest state
- persist quest state in local save
- keep progress event logging
- keep the app working offline
- do not introduce Phaser or a heavy game framework

Before editing, summarize the files you plan to modify.
After editing, run npm run build.
```

## Step 4 — Review

Check:

- changed files;
- build result;
- no Phaser dependency;
- local save still works;
- dialogue still opens;
- progress events still write to IndexedDB.

## Step 5 — Work task by task

Recommended sequence:

1. DialogueManager + QuestManager integration
2. zod validation for JSON files
3. local debug panel
4. RemoteApiClient fake adapter
5. Supabase/custom backend adapter
6. offline asset cache button
7. Crossroads scene
8. educational report generator
9. workshop/session user model
10. PWA install and mobile polish

## Prompt for each task

```text
Read AGENTS.md.

Work only on Task [number] from docs/NEXT_DEVELOPMENT_TASKS.md.

Do not change unrelated files.
Keep the app offline-first.
Run npm run build before finishing.

Summarize:
- files changed
- what works
- what still needs review
```
