# Characters Asset Inventory
## *Justurbanities: Eurbanities and Fragmentation*
### Inventario tecnico reference sheet e sprite production plan

---

## 1. Funzione del documento

Questo documento organizza i **22 character reference sheet** caricati per il progetto e definisce come trasformarli in asset tecnici utilizzabili nello sviluppo HTML5/TypeScript/Phaser.

I file caricati sono da considerare:

```text
/art/references/characters/
```

Non sono ancora sprite sheet tecnici pronti per Phaser.

---

## 2. Stato generale

Totale reference sheet caricati: **22**

### Tipologie

- **Playable characters:** 4
- **NPC principali:** 16
- **Child / young NPC:** 2
- **Custom character:** non ancora prodotto

---

## 3. Lista completa personaggi

| # | Personaggio | Tipo | Ruolo | File reference consigliato |
|---|---|---|---|---|
| 1 | Maya | Playable | Madre single / care network | `maya_reference_sheet.jpeg` |
| 2 | Samir | Playable | Nuovo cittadino / bridge language | `samir_reference_sheet.jpeg` |
| 3 | Elena | Playable | Civic worker / institutional access | `elena_reference_sheet.jpeg` |
| 4 | Luca | Playable | Local entrepreneur / resource mobilizer | `luca_reference_sheet.jpeg` |
| 5 | Zoe | Child NPC | Figlia di Maya / attention | `zoe_reference_sheet.jpeg` |
| 6 | Lia | Child NPC | Figlia di Pablo / curiosity | `lia_reference_sheet.jpeg` |
| 7 | Anna | NPC | Civic tech / community app developer | `anna_reference_sheet.jpeg` |
| 8 | Ben | NPC | Accessibility mentor / barrier spotter | `ben_reference_sheet.jpeg` |
| 9 | Alexandria Shrinehill | NPC | Mayor / institutional pressure | `alexandria_reference_sheet.jpeg` |
| 10 | Abdullah | NPC | Ecologist / renewable energy advocate | `abdullah_reference_sheet.jpeg` |
| 11 | Amin | NPC | Pub owner / people magnet | `amin_reference_sheet.jpeg` |
| 12 | Gwen | NPC | Bus driver / mobility motivator | `gwen_reference_sheet.jpeg` |
| 13 | Giorgia | NPC | Yoga instructor / soothing aura | `giorgia_reference_sheet.jpeg` |
| 14 | Tom | NPC | Municipal clerk / rule keeper | `tom_reference_sheet.jpeg` |
| 15 | Donald | NPC | Former mayor / community history | `donald_reference_sheet.jpeg` |
| 16 | Pablo | NPC | Postman / connector | `pablo_reference_sheet.jpeg` |
| 17 | Matilda | NPC | Florist / make it beautiful | `matilda_reference_sheet.jpeg` |
| 18 | Mrs Viveca | NPC | Retired teacher / community memory | `mrs_viveca_reference_sheet.jpeg` |
| 19 | Marta | NPC | Comic writer / write your story | `marta_reference_sheet.jpeg` |
| 20 | Ruben | NPC | Journalist / investigate | `ruben_reference_sheet.jpeg` |
| 21 | Sigrid | NPC | Carpenter / fixer | `sigrid_reference_sheet.jpeg` |
| 22 | Siobhan | NPC | Gardener / green thumb | `siobhan_reference_sheet.jpeg` |

---

## 4. Naming correction

Il file caricato come:

```text
SIOBAHN.jpeg
```

va rinominato in:

```text
SIOBHAN.jpeg
```

Naming consigliato finale:

```text
siobhan_reference_sheet.jpeg
```

---

## 5. Personaggi mancanti

## 5.1 Custom Character

Il personaggio personalizzabile non è ancora presente.

### Funzione

Il Custom Character rappresenta il giocatore come cittadino situato, non come eroe neutro.

### Asset richiesti

```text
custom_reference_sheet.jpeg
custom_base_sprite_sheet.png
custom_portrait_neutral.png
custom_portrait_thoughtful.png
custom_portrait_encouraging.png
```

### Possibile struttura preset

Per la vertical slice è sufficiente produrre:

```text
custom_preset_01
custom_preset_02
custom_preset_03
custom_preset_04
```

Ogni preset può condividere la stessa animazione base, cambiando palette, capelli e outfit.

---

## 6. Priorità per vertical slice

## Priorità A — indispensabili

Questi personaggi devono avere sprite tecnici e portrait nella prima vertical slice:

| Personaggio | Motivo |
|---|---|
| Maya | Playable route |
| Samir | Playable route |
| Elena | Playable route |
| Luca | Playable route |
| Custom Character | Player avatar |
| Anna | Prologo, mappa, civic tech |
| Ben | Accessibilità, prologo |
| Zoe | Route Maya / care perspective |

---

## Priorità B — importanti

Questi personaggi devono avere almeno idle + talking pose:

| Personaggio | Motivo |
|---|---|
| Gwen | Crossroads / mobilità |
| Abdullah | Newsstand / informazione |
| Tom | Town Hall / procedura |
| Amin | Terzo luogo / relazioni |
| Alexandria | Sindaca / istituzione |
| Ruben | Media / Fragmentation |
| Sigrid | Commons / riparazione |
| Giorgia | Care / burnout |
| Lia | Child perspective secondaria |
| Pablo | Connessione quotidiana |
| Matilda | Cura urbana / verde |

---

## Priorità C — espansione

Questi personaggi possono rimanere come reference + portrait statico nella prima fase:

| Personaggio | Motivo |
|---|---|
| Marta | Storytelling / visual communication |
| Mrs Viveca | Memoria / intergenerazionale |
| Donald | Memoria politica |
| Siobhan | Green care / gardens |

---

## 7. Sprite minimi richiesti

## 7.1 Playable characters

Per Maya, Samir, Elena, Luca e Custom:

```text
idle_down: 1 frame
idle_up: 1 frame
idle_left: 1 frame
idle_right: 1 frame

walk_down: 4 frame
walk_up: 4 frame
walk_left: 4 frame
walk_right: 4 frame

talk: 2 frame
interact: 2 frame
phone_or_tool: 1 frame
stressed_or_thinking: 1 frame
```

Totale minimo:

```text
23 frame per personaggio
```

Totale per 5 playable:

```text
115 frame circa
```

---

## 7.2 NPC principali

Per NPC Priorità A e B:

```text
idle_front: 1 frame
talk_front: 1 frame
idle_side: 1 frame opzionale
interaction_pose: 1 frame opzionale
```

Totale minimo:

```text
2–4 frame per NPC
```

---

## 7.3 Child NPC

Per Zoe e Lia:

```text
idle_front: 1 frame
talk_front: 1 frame
curious_pose: 1 frame
pointing_or_showing_object: 1 frame
```

---

## 8. Portrait richiesti

## 8.1 Playable characters

Ogni playable dovrebbe avere almeno:

```text
neutral
focused
concerned
happy
stressed
determined
```

### File naming

```text
portrait_maya_neutral.png
portrait_maya_focused.png
portrait_maya_concerned.png
portrait_maya_happy.png
portrait_maya_stressed.png
portrait_maya_determined.png
```

---

## 8.2 NPC

Ogni NPC dovrebbe avere almeno:

```text
neutral
talking
concerned_or_thoughtful
positive
```

### File naming

```text
portrait_anna_neutral.png
portrait_anna_talking.png
portrait_anna_concerned.png
portrait_anna_positive.png
```

---

## 9. Struttura cartelle consigliata

```text
/art
  /references
    /characters
      maya_reference_sheet.jpeg
      samir_reference_sheet.jpeg
      elena_reference_sheet.jpeg
      luca_reference_sheet.jpeg
      zoe_reference_sheet.jpeg
      ...
  /source
    /characters
      /maya
        maya_model_final.psd
        maya_model_final.png
      /samir
      /elena
      /luca
  /approved
    /characters

/public
  /assets
    /characters
      /maya
        /sprites
        /portraits
        /atlas
      /samir
      /elena
      /luca
      /custom
      /anna
      /ben
      /zoe
```

---

## 10. Naming convention sprite

## 10.1 Sprite singoli

```text
char_[name]_[action]_[direction]_[frame].png
```

Esempi:

```text
char_maya_idle_down_01.png
char_maya_walk_down_01.png
char_maya_walk_down_02.png
char_maya_walk_left_01.png
char_samir_talk_front_01.png
char_elena_phone_front_01.png
```

---

## 10.2 Atlas

```text
[name]_atlas.png
[name]_atlas.json
```

Esempi:

```text
maya_atlas.png
maya_atlas.json
samir_atlas.png
samir_atlas.json
```

---

## 11. Animazioni consigliate per Phaser

## 11.1 Playable

```json
{
  "maya": {
    "idle_down": ["char_maya_idle_down_01"],
    "walk_down": [
      "char_maya_walk_down_01",
      "char_maya_walk_down_02",
      "char_maya_walk_down_03",
      "char_maya_walk_down_04"
    ],
    "walk_up": [
      "char_maya_walk_up_01",
      "char_maya_walk_up_02",
      "char_maya_walk_up_03",
      "char_maya_walk_up_04"
    ],
    "walk_left": [
      "char_maya_walk_left_01",
      "char_maya_walk_left_02",
      "char_maya_walk_left_03",
      "char_maya_walk_left_04"
    ],
    "walk_right": [
      "char_maya_walk_right_01",
      "char_maya_walk_right_02",
      "char_maya_walk_right_03",
      "char_maya_walk_right_04"
    ],
    "talk": [
      "char_maya_talk_front_01",
      "char_maya_talk_front_02"
    ],
    "phone": ["char_maya_phone_front_01"],
    "stressed": ["char_maya_stressed_front_01"]
  }
}
```

---

## 12. Dimensioni consigliate

## 12.1 Frame sprite

```text
Playable adult: 256 x 256 px
NPC adult: 256 x 256 px
Child NPC: 192 x 192 px o 256 x 256 px con scala interna minore
```

## 12.2 Portrait

```text
Portrait dialogo: 1024 x 1024 px
Portrait UI compatto: 512 x 512 px
Icona personaggio: 256 x 256 px
```

## 12.3 In-game display

Altezza personaggio su schermo:

```text
adult: 90–140 px
child: 70–100 px
```

---

## 13. characters.json — proposta iniziale

```json
[
  {
    "id": "maya",
    "displayName": "Maya",
    "type": "playable",
    "role": "Single mother",
    "theme": ["care", "time", "daily exhaustion"],
    "ability": "Care Network",
    "resource": "Family Load",
    "reference": "maya_reference_sheet.jpeg",
    "priority": "A"
  },
  {
    "id": "samir",
    "displayName": "Samir",
    "type": "playable",
    "role": "New citizen",
    "theme": ["belonging", "language", "adaptation"],
    "ability": "Bridge Language",
    "resource": "Recognition",
    "reference": "samir_reference_sheet.jpeg",
    "priority": "A"
  },
  {
    "id": "elena",
    "displayName": "Elena",
    "type": "playable",
    "role": "Civic worker",
    "theme": ["institutions", "access", "bureaucracy", "equity"],
    "ability": "Institutional Access",
    "resource": "Institutional Pressure",
    "reference": "elena_reference_sheet.jpeg",
    "priority": "A"
  },
  {
    "id": "luca",
    "displayName": "Luca",
    "type": "playable",
    "role": "Local entrepreneur",
    "theme": ["work", "resources", "sustainability", "resilience"],
    "ability": "Resource Mobilizer",
    "resource": "Business Stability",
    "reference": "luca_reference_sheet.jpeg",
    "priority": "A"
  },
  {
    "id": "zoe",
    "displayName": "Zoe",
    "type": "child_npc",
    "role": "Maya's daughter",
    "theme": ["care", "curiosity", "attention"],
    "ability": "See What Matters",
    "resource": "Attention",
    "reference": "zoe_reference_sheet.jpeg",
    "priority": "A"
  },
  {
    "id": "lia",
    "displayName": "Lia",
    "type": "child_npc",
    "role": "Pablo's daughter",
    "theme": ["curiosity", "discovery", "future"],
    "ability": "See Beyond",
    "resource": "Curiosity",
    "reference": "lia_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "anna",
    "displayName": "Anna",
    "type": "npc",
    "role": "Tech enthusiast and community app developer",
    "theme": ["innovation", "digital tools", "community"],
    "ability": "Civic Tech",
    "resource": "Digital Tools",
    "reference": "anna_reference_sheet.jpeg",
    "priority": "A"
  },
  {
    "id": "ben",
    "displayName": "Ben",
    "type": "npc",
    "role": "Retired mechanic and seniors advocate",
    "theme": ["community care", "accessibility", "active aging"],
    "ability": "Barrier Spotter",
    "resource": "Accessibility",
    "reference": "ben_reference_sheet.jpeg",
    "priority": "A"
  },
  {
    "id": "alexandria",
    "displayName": "Alexandria Shrinehill",
    "type": "npc",
    "role": "Mayor",
    "theme": ["leadership", "responsibility", "institutional pressure"],
    "ability": "Institutional Pressure",
    "resource": "Public Service",
    "reference": "alexandria_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "abdullah",
    "displayName": "Abdullah",
    "type": "npc",
    "role": "Ecologist and renewable energy advocate",
    "theme": ["energy", "sustainability", "hopeful activism"],
    "ability": "Energy",
    "resource": "Renewable",
    "reference": "abdullah_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "amin",
    "displayName": "Amin",
    "type": "npc",
    "role": "Pub owner and community connector",
    "theme": ["hospitality", "inclusion", "neighborhood vitality"],
    "ability": "People Magnet",
    "resource": "Community",
    "reference": "amin_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "gwen",
    "displayName": "Gwen",
    "type": "npc",
    "role": "Bus driver",
    "theme": ["mobility", "energy", "public transport"],
    "ability": "Motivate",
    "resource": "Mobility",
    "reference": "gwen_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "giorgia",
    "displayName": "Giorgia",
    "type": "npc",
    "role": "Yoga instructor",
    "theme": ["well-being", "balance", "inner harmony"],
    "ability": "Soothing Aura",
    "resource": "Empathy",
    "reference": "giorgia_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "tom",
    "displayName": "Tom",
    "type": "npc",
    "role": "Municipal clerk",
    "theme": ["administration", "rules", "accuracy"],
    "ability": "Rule Keeper",
    "resource": "Procedure",
    "reference": "tom_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "donald",
    "displayName": "Donald",
    "type": "npc",
    "role": "Former mayor",
    "theme": ["nostalgia", "community history", "political memory"],
    "ability": "Community History",
    "resource": "Memory",
    "reference": "donald_reference_sheet.jpeg",
    "priority": "C"
  },
  {
    "id": "pablo",
    "displayName": "Pablo",
    "type": "npc",
    "role": "Postman",
    "theme": ["connection", "reliability", "everyday care"],
    "ability": "Connector",
    "resource": "Connection",
    "reference": "pablo_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "matilda",
    "displayName": "Matilda",
    "type": "npc",
    "role": "Flower shop owner / florist",
    "theme": ["beauty", "care", "flowers", "local business"],
    "ability": "Make It Beautiful",
    "resource": "Beauty",
    "reference": "matilda_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "mrs_viveca",
    "displayName": "Mrs Viveca",
    "type": "npc",
    "role": "Retired teacher and mentor",
    "theme": ["memory", "intergenerational wisdom", "community support"],
    "ability": "Community Memory",
    "resource": "Memory",
    "reference": "mrs_viveca_reference_sheet.jpeg",
    "priority": "C"
  },
  {
    "id": "marta",
    "displayName": "Marta",
    "type": "npc",
    "role": "Comic writer",
    "theme": ["creativity", "storytelling", "self-expression"],
    "ability": "Write Your Story",
    "resource": "Creativity",
    "reference": "marta_reference_sheet.jpeg",
    "priority": "C"
  },
  {
    "id": "ruben",
    "displayName": "Ruben",
    "type": "npc",
    "role": "Journalist and investigative reporter",
    "theme": ["truth", "transparency", "civic awareness"],
    "ability": "Investigate",
    "resource": "Truth",
    "reference": "ruben_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "sigrid",
    "displayName": "Sigrid",
    "type": "npc",
    "role": "Carpenter and fixer",
    "theme": ["manual skills", "practical solutions", "repair"],
    "ability": "Fixer",
    "resource": "Manual Skills",
    "reference": "sigrid_reference_sheet.jpeg",
    "priority": "B"
  },
  {
    "id": "siobhan",
    "displayName": "Siobhan",
    "type": "npc",
    "role": "Gardener",
    "theme": ["nature", "urban greening", "community care"],
    "ability": "Green Thumb",
    "resource": "Nature",
    "reference": "siobhan_reference_sheet.jpeg",
    "priority": "C"
  }
]
```

---

## 14. Checklist produzione sprite

Per ogni personaggio:

```markdown
- [ ] reference sheet rinominato correttamente
- [ ] portrait neutral esportato
- [ ] portrait positive esportato
- [ ] portrait concerned esportato
- [ ] sprite idle creato
- [ ] sprite talk creato
- [ ] sprite walk creato, se playable
- [ ] atlas generato
- [ ] JSON animazioni creato
- [ ] test in Phaser
- [ ] approvazione art direction
```

---

## 15. Primo batch di produzione consigliato

## Batch 1 — Core playable

```text
Maya
Samir
Elena
Luca
Custom Character
```

## Batch 2 — Prologue NPC

```text
Anna
Ben
Zoe
```

## Batch 3 — Crossroads / vertical slice

```text
Gwen
Abdullah
Tom
Amin
Alexandria
```

## Batch 4 — Supporting cast

```text
Ruben
Sigrid
Giorgia
Pablo
Matilda
Lia
```

## Batch 5 — Expansion

```text
Marta
Mrs Viveca
Donald
Siobhan
```

---

## 16. Regola finale

I reference sheet caricati sono la **fonte visiva ufficiale** per personaggi, portrait, sprite e prompt successivi.

Ogni nuovo asset deve rispettare:

- silhouette;
- palette;
- outfit;
- accessori;
- ruolo;
- tono emotivo;
- proporzioni;
- coerenza con lo stile warm urban cartoon / civic adventure.

Se uno sprite funziona tecnicamente ma non sembra lo stesso personaggio del reference sheet, non va approvato.
