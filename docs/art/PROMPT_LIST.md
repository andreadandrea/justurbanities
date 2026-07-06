# Lista prompt grafiche — pipeline operativa

*Generato dal Prompt Bible Operativo (fonte canonica) + Guida 04. Ordine = priorità di produzione (Piano Master P7). Ogni prompt è pronto da incollare in Higgsfield/ChatGPT/Midjourney.*

## Come usare questa lista

1. **Ad ogni prompt aggiungi sempre in coda il negative prompt** (sotto).
2. Le parti tra `[parentesi quadre]` vanno scelte al momento della generazione.
3. Salva l'output col **nome file target** indicato, mettilo in uno **zip** e caricalo in chat (le immagini incollate inline non arrivano su disco): l'agente fa scontorno, crop e commit.
4. Regola finale di coerenza (Prompt Bible §19): se l'immagine è bella ma generica, non va bene; se fa capire *chi usa lo spazio, chi resta fuori e cosa potrebbe cambiare*, funziona.

### Negative prompt universale (sempre in coda)

> No photorealism, no hyperrealistic 3D, no anime style, no chibi proportions, no cyberpunk neon, no fantasy monsters, no dark dystopian horror, no corporate flat vector illustration, no childish preschool style, no exaggerated caricature, no stereotypes, no poverty porn, no generic slum imagery, no excessive UI text, no unreadable signage, no overdramatic lighting, no glossy plastic surfaces, no medieval fantasy, no sci-fi interface, no generic business presentation icons.

---

## PRIORITÀ 1 — Key visual (il bloccante: 3 candidati, poi se ne approva uno)

**Target:** `env_eurbania_keyvisual_v[1-3].png` — genera 3 varianti dello stesso prompt e scegli.

> Create a key visual for Justurbanities: Eurbanities and Fragmentation, a warm 2D civic narrative adventure game. Show an expanded contemporary European city called Eurbania from a slightly top-down semi-isometric 2.5D perspective. At the center, a warm community center glows with life, while several surrounding neighborhoods appear partially connected and partially fragmented. Some districts are warm and active, others are slightly desaturated with broken connection lines, empty public spaces, confusing signage and layered posters. Include diverse residents, civic actors, local shops, public transport, greenery, public spaces and subtle signs of urban crisis. The mood should be hopeful but realistic, showing a city under pressure but full of possible connections. Warm urban cartoon style, expressive details, soft textures, readable composition, not childish, not photorealistic. Warm natural palette with urban terracotta, ochre, off-white cream, sage green, soft petrol blue, warm concrete greys, community orange and muted turquoise.

**Variante schermata iniziale** — `ui_startscreen_eurbania.png`:

> Create a start screen illustration for a civic narrative game titled Justurbanities: Eurbanities and Fragmentation. Show Eurbania at sunset in a warm 2D urban cartoon style, semi-isometric 2.5D view. The Community Center is visible as a warm, imperfect, welcoming hub with lights on, plants, posters and people nearby. Around it, different neighborhoods extend outward: a dense crossroads district, a grey courtyard district, old temporary housing blocks, a youth court, a coastline quarter, hill gardens and a lake edge. Some connection lines between districts are glowing and warm, others are cracked, desaturated and slightly glitching. The title area should leave clean space for typography. Hopeful but realistic atmosphere, not too dark, not childish.

---

## PRIORITÀ 2 — Ambienti delle 2 scene esistenti (oggi rettangoli colorati)

*Dopo l'approvazione del key visual, usa la stessa seed/stile come riferimento.*

### 2a. Community Center Hall — `env_hub_hall_neutral.png`

> Create an environment illustration of the Community Center Hall in Eurbania, in a warm 2D urban cartoon style, semi-isometric 2.5D view. The hall is homely, imperfect, welcoming and lived-in: mismatched chairs, recycled furniture, notice boards, civic posters, plants, tables, community objects, a digital city map, a logbook table and signs of past repairs. The space should feel warm but slightly tired, with some desaturated corners showing early Fragmentation. Include subtle human traces but not too much clutter. Clear navigable layout for a game scene.

### 2b. Community Center — sala assemblea — `env_hub_assembly_neutral.png`

> Create a semi-isometric 2.5D environment illustration of the Community Center Assembly Room for a warm civic adventure game. The room has a circle of mismatched chairs, a central table, projector or digital map, notice board, warm lights, papers, community objects and visible empty chairs that matter narratively. It should be suitable for a public assembly about the city. Make the room feel welcoming but politically tense: some people are present, some seats are empty. Warm urban cartoon style, readable layout, soft textures.

### 2c. Crossroads — vista distretto — `env_crossroads_overview_neutral.png`

> Create an environment concept of Crossroads, a dense multicultural urban district in Eurbania, shown in a slightly top-down semi-isometric 2.5D view. Include a main bus hub, market stalls, small shops, multilingual signs, pedestrian crossings, layered flyers, people waiting, cyclists, street furniture, and mixed flows of residents. The place should feel alive but fragmented: communication is everywhere, but not everyone is connected. Some signs are confusing, some paths are blocked, some areas are desaturated. Warm urban cartoon style, detailed but readable, not chaotic beyond usability.

### 2d. Crossroads POI (uno per file)

- `env_crossroads_bushub_neutral.png` — Prompt Bible §9.6 (Main Bus Hub: pensilina, orari confusi, gente che aspetta con bisogni diversi)
- `env_crossroads_market_neutral.png` — §9.7 (Multilingual Market: bancarelle, reti sociali separate)
- `env_crossroads_narrowcrossing_neutral.png` — §9.8 (Narrow Crossing: attraversamento ostile, semaforo corto, marciapiede stretto)

---

## PRIORITÀ 3 — Icone risorsa + stati cromatici

### 3a. Icone risorsa (oggi emoji placeholder) — `ui_icon_<risorsa>.png`

Un prompt per ciascuna: `trust`, `care`, `commons`, `voice`, `resilience`, `fragmentation`.

> Create a small game UI icon representing [Trust / Care / Commons / Voice / Resilience / Fragmentation] for a warm 2D civic narrative game. Hand-drawn community logbook style, warm cream background, soft organic outline, single readable symbol, [warm terracotta / sage green / community orange / soft petrol blue / muted turquoise / cold desaturated grey-blue] accent, no text, readable at 32px, not corporate, not sci-fi.

*(Suggerimento simboli: Trust = mani/stretta, Care = tazza o coperta, Commons = tavolo condiviso, Voice = megafono di carta o fumetto, Resilience = germoglio tra pietre, Fragmentation = linea spezzata.)*

### 3b. Stati cromatici (stesso ambiente, 4 stati) — per la calibrazione del filtro runtime

**Target:** `env_hub_hall_fragmented.png`, `_awakening.png`, `_connected.png`, `_thriving.png`
Usa il **quadro comparativo** (miglior risultato con un'immagine sola):

> Create a four-panel comparison of the same urban neighborhood location in Eurbania, shown in warm 2D semi-isometric civic adventure style. Panel 1: Fragmented, desaturated, cold, empty, confusing signs, broken connection lines. Panel 2: Awakening, small warm lights, first repairs, handwritten signs, one or two people reconnecting. Panel 3: Connected, clearer paths, more people using space, repaired furniture, plants, readable signage. Panel 4: Thriving Commons, full but realistic civic life, shared tables, intergenerational activity, warm colors, strong sense of community ownership. Keep the layout identical across panels for comparison.

---

## PRIORITÀ 4 — Personaggi: completare i giocabili

*Maya ha già ritratto reale. Mancano: sprite direzionali di Maya nel nuovo stile + tutto per gli altri.*

### 4a. Sprite Maya (4 direzioni) — `char_maya_sprite_<dir>_<frame>.png`

> Create a sprite reference sheet for Maya in a warm 2D semi-isometric civic adventure game. Show small readable sprites in 4 directions: idle, walking, talking, phone use, tired/stressed pose, helping/interacting pose. She should have a clear silhouette, large practical bag, comfortable clothes, expressive posture. Style: semi-stylized urban cartoon, soft outlines, warm palette, not chibi, not pixel art. Match the attached reference portrait.

### 4b. Samir — `char_samir_portrait_[neutral|thoughtful|uncertain|smile|hurt|confident].png`

> Create a large dialogue portrait of Samir, a 28–35 year old man in a warm 2D urban civic adventure game. Chest-up portrait, expressive semi-stylized face, attentive eyes, subtle restrained smile or thoughtful uncertainty. Everyday urban jacket, bag strap or document edge visible. Expression: [neutral thoughtful / uncertain / small smile / hurt but controlled / confident and recognized]. Palette: petrol blue, muted turquoise, warm brown, cream. Soft outlines, warm but grounded lighting, suitable for dialogue UI.

*(Full body e sprite: Prompt Bible §7.5, §7.7.)*

### 4c. Elena — `char_elena_portrait_[neutral|concerned|defensive|sincere|stressed|relieved].png`

> Create a large dialogue portrait of Elena, a 40–48 year old municipal officer for a warm 2D civic adventure game. Chest-up portrait, professional smart-casual outfit, badge or tablet visible, expressive face. Expression: [neutral professional / concerned / defensive / transparent and sincere / stressed / relieved]. Palette: petrol blue, warm grey, institutional violet, cream. Soft outlines, clean but warm rendering, dialogue UI ready.

### 4d. Luca — `char_luca_portrait_[neutral|smile|worried|irritated|confident|suspicious].png`

> Create a large dialogue portrait of Luca, a 35–45 year old local small business owner for a warm 2D urban civic adventure game. Chest-up portrait, rolled sleeves or apron, keys or receipt visible. Expression: [neutral / business smile / worried / irritated / pragmatic and confident / suspicious]. Palette: olive green, warm brown, rust red, cream. Soft organic outlines, warm lighting, dialogue UI ready.

### 4e. Custom — preset sheet — `char_custom_presets.png`

> Create a preset character sheet for the custom player character in a warm 2D urban civic adventure game. Show 4–6 simple preset variations with different hairstyles, skin tones, body shapes and everyday urban outfits. The design should feel neutral but situated, adaptable but not generic, like a citizen entering a participatory process. Each preset should have a clear silhouette and a small customizable color accent. Style: semi-stylized warm urban cartoon, grounded, non-stereotypical, readable in semi-isometric 2.5D view.

---

## PRIORITÀ 5 — Asset mancanti dichiarati (bonifica Guida 04 §4)

### 5a. Mystery Corporate Man (nessun asset esiste) — `char_corporate_man_portrait_neutral.png`

> Create a character concept of Mystery Corporate Man, an ambiguous figure connected to speculative urban development. He should appear mostly as a dark silhouette wearing a hat, elegant and unreadable, with cold geometric shapes and no warmth. Do not make him a fantasy villain. He should feel like a distant corporate presence: emails, contracts, polished shoes, reflective surfaces, minimal logo. Palette: black, cold grey, deep violet, muted white. Warm 2D game style but with colder, sharper design language.

### 5b. Zoe (figlia di Maya, ✳ ratificata) — `char_zoe_portrait_neutral.png`

> Create a full-body character concept of Zoe, Maya's 8-year-old daughter, for a warm 2D urban civic adventure game. She is curious, direct, sensitive and observant. She wears colorful everyday child clothing, a small backpack, and carries a drawing folder or pencils. She should look lively but grounded, not cartoonishly hyperactive. Palette: warm yellow, muted turquoise, soft coral, small green accents. Semi-stylized expressive cartoon, readable silhouette, childlike but realistic, not infantile, not exaggerated.

### 5c. NPC storici prioritari per le scene attive (Anna e Ben sono già in gioco)

- `char_anna_portrait_*.png` — Prompt Bible §8.1 (mentor civica, tablet, violet/warm yellow)
- `char_ben_portrait_*.png` — §8.2 (65 anni, sedia a rotelle disegnata con accuratezza e rispetto, soft blue/sage)
- Poi in ordine di apparizione nelle quest N01–N18: Sigrid (§8.5), Abdullah (§8.7), Gwen (§8.9), Amin (§8.12), Ruben (§8.6), Tom (§8.8), gli altri a seguire.

---

## PRIORITÀ 6 — UI e scene narrative (dopo M-B, motore vivo)

- `ui_dialogue_mockup.png` — Prompt Bible §14.1 (logbook di comunità, crema caldo, 2–4 scelte)
- `ui_logbook.png` — §14.2 (tab: Quests, People, Promises, Map Notes, Resources, Empathy Notes)
- `ui_citymap.png` — §14.3 (mappa civica annotata a mano, linee calde vs spezzate)
- `ui_report.png` — §14.4 (report educativo: Who arrived / What changed / What was missed — NON una schermata punteggio)
- Scene narrative §13.1–13.8 (prologo, prima assemblea, 4 route + custom, arrivo a Crossroads)

---

## Nota — Doppia veste grafica (realistic / animal)

La variante **animal** è requisito core (SPEC_Dual_Art_Style). Quando il set realistico è approvato, ogni prompt personaggio si rigenera con questa trasformazione in coda:

> Reimagine the same character as an anthropomorphic animal keeping identical clothing, accessories, posture, palette and personality. Choose a species that echoes the character's temperament without stereotyping. Same warm 2D urban cartoon civic adventure style, same silhouette readability, same expression set.

*(Specie da decidere con Andrea prima del batch — annotarle in questa lista quando ratificate.)*
