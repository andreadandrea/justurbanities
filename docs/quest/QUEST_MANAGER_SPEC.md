# QuestManager Specification

The QuestManager controls quest state and objectives.

Required files already included:

```text
src/game/quest/QuestManager.ts
src/types/Quest.ts
src/data/quests.json
```

First quests:

- P01 — The Center Holds?
- P02 — Same City, Different Routes
- C01 — Arriving Is Already Participation

First integration target:

- Dialogue with Anna starts P01.
- Dialogue with Anna completes `talk_to_anna`.
- Dialogue with Ben completes `talk_to_ben`.
