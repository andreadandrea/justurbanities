# Integrazione — Quest NPC e logica di crisi nel repo `justurbanities`

**Repo:** https://github.com/andreadandrea/justurbanities · **Data:** 19 giugno 2026
**Fonte design:** "NPC Esigenze, Quest e Storyline.docx" §5 (modello interazione + incrocio crisi).

I file in `demo/data/` sono **allineati al motore reale** (TypeScript/PWA), non al vecchio handoff vanilla. Sono pronti da **unire** ai dati esistenti in `src/data/`.

## File prodotti e dove vanno

| File qui | Confluisce in | Schema (repo) |
|---|---|---|
| `quests.npc.json` | append all'array di `src/data/quests.json` | `QuestFile` — `src/types/Quest.ts` |
| `dialogues.npc.json` | append all'array di `src/data/dialogues.json` | `DialogueFile` — `src/types/Dialogue.ts` |
| `crises.json` | nuovo file `src/data/crises.json` (richiede tipo+manager, vedi sotto) | proposta di estensione |

Validati strutturalmente contro gli schemi zod di `src/data/validation.ts` (quest e dialoghi) e contro le union `Effect`/`Condition`.

## Convenzioni rispettate (dal motore)

- **Risorse** = solo le 6 di `GameState`: `trust, care, commons, voice, resilience, fragmentationGlobal`. Incrementi piccoli (`addResource` +1/+2/+3), coerenti con i dati esistenti (P01 usa +1).
- **Effetti** = `setVariable | addResource | startQuest | completeObjective | completeQuest | createProgressEvent`.
- **Condizioni** = `variableEquals | variableNotEquals | resourceAtLeast | resourceBelow | questState`.
- **Quest** = `{ id, title, description, status, objectives[], rewards?[] }`, `status` iniziale `"locked"`.
- **Dialoghi** = `{ id, speakerId, startNode, nodes{} }`; ogni choice ha `effects?`, `conditions?`, `next`/`end`. `speakerId` = id di `characters.json` (es. `pablo`, `mrs_viveca`; per Mystery Corporate Man uso `narrator`, manca l'asset).
- **rel/personali/fragmentation-per-tipo** non sono risorse nel motore: vanno in `variables` via `setVariable` (es. `promiseSupportLonelyElders="active"`, `samirRecognized=true`). Non esiste un `addVariable`: niente incrementi su variabili.

## Quest NPC (18) — ID `N01`–`N18`

Ogni quest ha 1–2 obiettivi e un `meta` (npc, abilityMatch, crisisLink) come documentazione (zod scarta le chiavi extra a runtime, il file le conserva). Il dialogo associato (`<speaker>_<id>`) parte con `startQuest`, e le scelte completano obiettivi/quest:

- **engage** → `completeObjective` × N + `addResource` (risorse cuscinetto) + `setVariable` (promessa) + `completeQuest`.
- **shortcut** → `addResource fragmentationGlobal +1` + `completeQuest` (esclusione/scorciatoia).

Esempi più ricchi: `pablo_n11` (2 nodi, scelta connect/survey) e `corporate_n18` (3 scelte, `negotiate` gated da `resourceAtLeast trust 5`). Quest gated: `N03`, `N06`, `N08` usano `conditions` sulla scelta engage.

> I testi nei dialoghi sono segnaposto IT. Se il progetto adotta un layer i18n, spostarli in chiavi locale come per i dialoghi esistenti.

## Crisi (Crisis Week) — estensione proposta

Il motore non ha ancora un tipo "crisi". `crises.json` la modella in modo che un futuro `CrisisManager` possa consumarla con il **vocabolario esistente** di `Condition`:

```ts
// src/types/Crisis.ts (proposta)
export type Crisis = {
  id: string; day: number; title: string; type: string;
  convergingNeeds: string[]; bufferResources: string[];
  resultVariable: string;                 // es. "heatwaveResolution"
  tiers: Record<"transformative"|"coordinated"|"reactive", { conditions: Condition[] }>;
};
```

Valutazione (fine giornata di Crisis Week), in ordine `transformative → coordinated → reactive`:

```ts
function resolveCrisis(c: Crisis, fx: EffectResolver, state: GameState) {
  const tier = (["transformative","coordinated","reactive"] as const)
    .find(t => fx.checkAll(c.tiers[t].conditions))!;   // reactive ha conditions:[] => sempre vero
  state.variables[c.resultVariable] = tier;
  return tier;
}
```

Soglie attuali (3 = coordinato, 6 = trasformativo, su risorse 0–100 ad incrementi +1) sono di **prima taratura**: vanno bilanciate in playtest. Le crisi indicano `convergingNeeds` (le linee NPC che si incrociano) e i `bufferResources`; il tier trasformativo richiede anche una quest pre-completata (`questState ... completed`), così "la resilienza si costruisce prima".

## Come testare dopo il merge

1. Append degli array, poi `npm run` dei test (`tests/quest/QuestManager.test.ts`, `tests/dialogue/DialogueManager.test.ts`) e la validazione zod (`src/data/validation.ts`).
2. Verificare che ogni `dialogues.npc.json[].speakerId` esista in `characters.json` (tutti presenti tranne il corporate man → `narrator`).
3. Collegare ogni dialogo NPC al punto di interazione nella scena del distretto (`src/scenes/*Scene.ts`), come Anna/Ben nel prologo.

## Mappa al design

Dettaglio completo, matrici e diagramma in "NPC Esigenze, Quest e Storyline.docx" §1 (NPC), §3 (archi giocabili), §5 (interazione + incrocio crisi). Le crisi `N→CRISIS_*` corrispondono alla matrice §5.3.
