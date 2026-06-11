# Next Development Tasks

## Task 1 — Integrate DialogueManager and QuestManager

Current state:

- `DialogueManager.ts`, `QuestManager.ts`, `EffectResolver.ts`, `dialogues.json`, and `quests.json` exist.
- `CommunityCenterScene` still uses hardcoded dialogue.

Goal:

- Load `dialogues.json` and `quests.json`.
- Instantiate `QuestManager`, `EffectResolver`, and `DialogueManager`.
- Replace hardcoded dialogue in `CommunityCenterScene`.
- Apply dialogue effects.
- Persist quest state.

Acceptance:

- Anna dialogue comes from JSON.
- Ben dialogue comes from JSON.
- P01 starts after talking to Anna.
- P01 objectives update after talking to Anna and Ben.
- Choices still log `progress_event`.
- `npm run build` passes.

## Task 2 — Add zod validation

Validate:

- asset manifest;
- characters;
- dialogues;
- quests;
- animations.

Acceptance:

- invalid JSON produces clear errors;
- preload stops gracefully if manifest is invalid.

## Task 3 — Add local debug panel

Show:

- current session ID;
- player position;
- resources;
- variables;
- active quests;
- pending sync queue items;
- clear local database button.

## Task 4 — Add RemoteApiClient fake mode

Create:

```text
src/sync/RemoteApiClient.ts
```

Modes:

- fake;
- REST placeholder;
- Supabase placeholder later.

## Task 5 — Offline asset cache control

Add UI:

```text
Download assets for offline play
Clear local asset cache
Show offline-ready status
```

## Task 6 — Crossroads scene

Create first district test scene:

- bus hub placeholder;
- market placeholder;
- narrow crossing placeholder;
- civic info point placeholder.

## Task 7 — Educational report generator

Generate a local JSON report from:

- session;
- savegame;
- progress events;
- resource changes;
- quest completion.
