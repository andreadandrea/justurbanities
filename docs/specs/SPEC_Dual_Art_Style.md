# SPEC — Dual Art Style (Realistic / Animal)
*v1.0 — 6 July 2026. Requirement: every character exists in TWO graphic versions — realistic and anthropomorphic-animal — switchable by the player at any time. (Riassunto IT: due versioni grafiche per tutti i personaggi, realistica e con fattezze animali, switchabili in gioco in qualsiasi momento; stessa identità, stessa palette, stessa silhouette leggibile.)*

## 1. Principles

1. **Same character, two skins.** Identity, personality, dialogue, animations and hitboxes are identical; only the art changes. The animal version is not a "kids mode" — same tone, same themes.
2. **One canon of style.** Both sets obey the Visual Bible: same palette/tokens, same lighting, same level of stylization, same 4 expressions (neutral, happy, worried, determined). A character must be recognizable across variants (colour blocking + silhouette + signature prop are the invariants).
3. **Variant is data, not code.** No `if (animal)` scattered in rendering code: the variant is a path segment resolved by the asset manifest.

## 2. Asset architecture

```
public/assets/characters/<id>/
  references/                     # shared reference sheets (+ animal reference sheet)
  realistic/{portraits,sprites,icons}/...
  animal/{portraits,sprites,icons}/...
```

- Filenames identical across variants (`portrait_<id>_neutral.png`, sprite atlases, icons). The manifest gains one dimension: `variant`.
- **Fallback chain (hard rule):** requested variant → `realistic` → generated placeholder. A missing animal asset must NEVER crash or block; it logs a warning in the debug panel.
- zod: manifest schema gets `variants: ["realistic","animal"]` with per-variant completeness report (drives the asset status doc).

## 3. Runtime behaviour

- **Setting `artStyle: "realistic" | "animal"`**, default `realistic`. Stored in Dexie settings AND in the save snapshot (a save remembers how it was played; changing mid-game is allowed and instant).
- Toggle lives in: options menu + character-select screen (preview both) + debug panel. Switch = swap texture sources; no reload, no scene restart.
- Applies everywhere a character is drawn: world sprites, dialogue portraits, character select, assembly scene, report, map pins.
- **Offline packs:** each variant is a separately downloadable cache pack in OfflineControls ("Download realistic pack / animal pack") — a classroom with animal-only install must work fully offline.
- Multiplayer note: art style is per-player (local preference), never synced.

## 4. Production pipeline (per character)

1. Animal reference sheet generated from the existing reference + Prompt Bible master prompt + the **animal modifier block** (§5), using the BOZZE drafts (`Charachter animal.png`, `NPC animal.png`) as style anchors.
2. Same process as realistic (HANDOFF §Asset pipeline): generate → zip → background removal → crop portrait/icon/full → manifest-matching filenames → commit.
3. Order: 5 playables → the 8 NPCs with schedules in Hub/Crossroads → remaining 10.

## 5. Prompt modifier (append to Prompt Bible master prompt) ✳

> "Anthropomorphic animal version of the same character: [SPECIES], same colour palette, same outfit and signature accessories, same pose and expression set, same painterly style and lighting. Expressive humanized face, digitigrade stance avoided (human body proportions with animal head/features, subtle tail optional). No cartoon exaggeration: keep the civic, warm, grounded tone."

## 6. Species mapping ✳ (proposals for the playables — Andrea ratifies; rest TBD in a content pass)

| Character | Species (proposal) | Rationale |
|---|---|---|
| Maya | Cat | Care under pressure, watchful warmth |
| Samir | Fox | Knows every route and every closed door |
| Elena | Owl | Institutional precision, night work |
| Luca | Badger | Stubborn local rootedness |
| Custom | Player-chosen from a small set | Self-positioning extends to species |
| NPCs (18) | — TBD table in Character Bible after ratification | Keep species-stereotype traps in check (no predator/prey coding of social groups) |

## 7. Acceptance criteria (engine, Phase 5)

Variant toggle swaps all character art live; fallback chain proven by test (delete one animal file → realistic used + warning); saves round-trip `artStyle`; both offline packs installable independently; zod completeness report lists missing animal assets per character.
