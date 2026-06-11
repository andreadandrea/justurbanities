# DialogueManager Specification

The DialogueManager controls dialogue trees loaded from JSON.

It supports:

- speaker;
- text;
- nodes;
- choices;
- conditions;
- effects;
- next node;
- end dialogue;
- progress event logging at scene/integration level.

Required files already included:

```text
src/game/dialogue/DialogueManager.ts
src/types/Dialogue.ts
src/game/effects/EffectResolver.ts
src/data/dialogues.json
```

First integration target:

- Anna dialogue from JSON.
- Ben dialogue from JSON.
- P01 quest effects from dialogue choices.
