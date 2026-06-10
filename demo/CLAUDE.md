# Justurbanities — Demo Web (visual novel)

Demo giocabile nel browser del prologo di **Justurbanities** (Eurbanities and Fragmentation), gioco narrativo cooperativo ed educativo ambientato nella città fittizia di Eurbania. Pubblico: partner di progetto europei. Il piano completo del ciclo di lavoro è in `../Piano di Lavoro — Handoff Claude Code.md`.

## Vincoli tecnici (non negoziabili)

- **Vanilla HTML/CSS/JS, nessun framework, nessun build step.** Deve funzionare aprendo `index.html` da `file://` e da un web server statico.
- **Tutto in questa cartella.** Nessuna dipendenza esterna (no CDN: la demo viene condivisa anche offline).
- **Token only:** colori, font-size, spazi, raggi, ombre, durate vengono SOLO da `design-tokens.css` (`--c-*`, `--fs-*`, `--s-*`, `--r-*`, `--e-*`, `--dur-*`). Nessun valore hardcoded nei componenti. I font (Fraunces, Nunito Sans) hanno fallback di sistema: `Georgia, serif` e `system-ui, sans-serif`.
- **Classi CSS:** radice `.ju-<componente>` (es. `.ju-dialogue`, `.ju-choice`), stati come `is-*` o `data-state`.
- **Non modificare i file in `data/`** se non per bugfix concordati: sono generati dal Dialogue Script ufficiale (Documento operativo §3). I `.docx` nella cartella padre sono SOLO lettura di riferimento, mai da modificare.

## Struttura file

```
demo/
  index.html            ← da creare
  style.css             ← da creare (importa design-tokens.css)
  game.js               ← da creare (motore)
  design-tokens.css     ← ESISTE — non modificare senza annotare in cima
  data/
    scenes.json         ← ESISTE — grafo scene del prologo (50 nodi)
    state.json          ← ESISTE — stato iniziale (risorse, flag, contatori)
    locales/{it,en,de,hu,pl,sv,ro}.json  ← ESISTONO — stringhe per lingua
  assets/
    char/               ← ESISTE — 8 ritratti PNG/JPEG (ANNA, BEN, GIORGIA, SIGRID, RUBEN, AMIN, ELENA, ALEXANDRIA)
    bg/                 ← vuota — sfondi resi come placeholder CSS (vedi sotto)
```

## Contratto dati

### scenes.json
`{ start: "p00_narration", nodes: [...] }`. Ogni nodo:

| Campo | Note |
|---|---|
| `id` | univoco; le stringhe sono in locales con chiavi `<id>.text` e `<id>.choice.<n>` |
| `type` | `dialogue` · `narration` (senza speaker box) · `hub` (menu scelte ricorrente) · `system` (toast/notifica) · `message` (in-world message, variante UI) · `end` |
| `speaker` | id parlante; nome visualizzato = locale `speaker.<id>`; `narrator`/`system` non mostrano ritratto |
| `portrait` | path relativo (es. `assets/char/ANNA.png`); assente per narrator/system/player |
| `bg` | id sfondo: `community_center_hall` o `city_map` — placeholder CSS (gradiente dai token + etichetta testo). L'engine deve cercare prima `assets/bg/<id>.png` e usare il placeholder se manca: così gli sfondi veri si aggiungono senza toccare il codice |
| `effects` | `{ "set": {flag: bool}, "inc": {counter: n} }` — applicati all'ENTRATA nel nodo |
| `choices[]` | `{ id, next, effects?, requires? }` — `effects` applicati al click |
| `requires` | array di condizioni `{ "var": "...", "eq": v }` oppure `{ "var": "...", "gte": n }` — tutte devono essere vere (AND). Scelta non soddisfatta = NASCOSTA (non disabled) |
| `next` | nodo successivo per nodi lineari (avanza con click/Spazio/Invio) |

### state.json
Tre blocchi: `resources` (0–100: trust, care, commons, voice, resilience, fragmentationGlobal), `flags` (bool), `counters` (int). I nomi vengono dalla Variable List ufficiale (Documento operativo §6) — non rinominarli. Lo stato runtime va salvato in `localStorage` (chiave `ju-demo-state`) per riprendere la partita; bottone Restart lo azzera.

### locales/
Chiave → stringa. Lingue: `it`, `en` complete; `de`, `hu`, `pl`, `sv`, `ro` sono stub con testo EN (campo `_status` lo segnala — ignorarlo nel runtime). Fallback: chiave mancante → `en` → mostra la chiave. Lingua selezionabile da UI (`ui.language`), persistita in `localStorage`, default `en`.

## Accessibilità (Definition of Done include questi punti)

- Scelte e controlli = `<button>` reali, navigabili da tastiera (Tab/frecce), attivabili con Invio/Spazio, focus visibile (`--c-focus`, anello 3px).
- Target interattivi ≥ 44×44px. Contrasto testo dialogo ≥ 7:1 (ink su paper), resto ≥ AA.
- Effetto typing del testo: saltabile al primo input; tutto il testo annunciato (aria-live sul box dialogo).
- Barre risorse: `role="meter"` + `aria-valuenow/min/max` + etichetta testuale; variazioni mostrate anche come testo (+/−), mai solo a colore.
- Glitch della mappa e transizioni colore disattivati sotto `prefers-reduced-motion`.
- Il colore non è mai l'unico segnale (pattern/tratteggio + icone + testo).

## Verifica

Dopo ogni modifica ai dati o al motore eseguire:

```bash
python3 - <<'EOF'
import json
s=json.load(open('data/scenes.json')); ids={n['id'] for n in s['nodes']}
errs=[t for n in s['nodes'] for t in ([n.get('next')] if n.get('next') else [])+[c['next'] for c in n.get('choices',[])] if t not in ids]
loc=json.load(open('data/locales/en.json'))
errs+=[n['id'] for n in s['nodes'] if n['type']!='hub' and f"{n['id']}.text" not in loc]
print("OK" if not errs else errs)
EOF
```

E un playthrough manuale completo: prologo → parla con Anna → 3+ NPC → mappa → risorse → messaggio Alexandria → schermata finale, in IT e in EN, con tastiera sola e con `prefers-reduced-motion` attivo.

## Decisioni implementative (Ciclo 1)

- **`data-embed.js` (generato, non editare a mano):** Chrome blocca `fetch()` di JSON da `file://`. Il motore prova prima `fetch` dei file in `data/` (fonte canonica) e, se fallisce, usa `window.JU_DATA` da `data-embed.js`. Dopo OGNI modifica a `data/*` rigenerare con:

```bash
python3 - <<'EOF'
import json, os
out={'scenes':json.load(open('data/scenes.json')),
     'state':json.load(open('data/state.json')),
     'locales':{}}
for f in sorted(os.listdir('data/locales')):
    if f.endswith('.json'):
        out['locales'][f[:-5]]=json.load(open(f'data/locales/{f}'))
src='/* AUTO-GENERATED from data/*.json — do not edit by hand.\n   Regenerate with the command in CLAUDE.md ("Decisioni implementative").\n   Fallback for file:// where fetch() of local JSON is blocked. */\nwindow.JU_DATA = '+json.dumps(out,ensure_ascii=False)+';\n'
open('data-embed.js','w').write(src)
EOF
```

- **Switcher lingua:** mostra solo le lingue il cui file locale è effettivamente presente/caricato; quando arrivano `it/pl/sv/ro.json` basta rigenerare `data-embed.js` e compaiono da sole.
- **Effetti applicati una sola volta:** gli `effects` di un nodo si applicano all'ingresso e lo stato viene salvato DOPO; al reload il nodo corrente viene ri-renderizzato senza riapplicarli.
- **Ritratti/sfondi mancanti:** `onerror` sull'immagine nasconde la cornice ritratto; per gli sfondi un probe una-tantum su `assets/bg/<id>.png` decide immagine vera vs placeholder CSS (con etichetta `id` visibile solo sul placeholder).
- **Glitch mappa:** classe `is-glitch` sul layer sfondo quando il nodo corrente è `map_8`; animazione disattivata sotto `prefers-reduced-motion`.

## Ciclo 2 — Same City, Different Routes (in corso)

- **Flusso esteso:** `char_select` (nuovo start, selezione personaggio) → prologo invariato → `end_prologue` (ora narration) → `route_router` (hub: visibile solo il percorso del personaggio scelto via `requires` su `playerCharacter`) → percorso di 5 nodi (`<char>_r1..r4` + `sys_<char>_arrived`) → `c2_end`.
- **Stato:** `flags.playerCharacter` (stringa: `maya|samir|elena|luca|custom`) + 5 flag `<char>ArrivedAssembly`. La scelta in `<char>_r3` modifica le risorse (`inc`).
- **⚠️ Testi EN dei percorsi = BOZZA** scritta da Claude in attesa del Dialogue Script ufficiale (Documento operativo §3): sostituirli vuol dire solo aggiornare le chiavi nei locales e rigenerare `data-embed.js` — zero modifiche al codice. Stessa cosa per i personaggi Maya/Samir/Luca (archetipi provvisori).
- **Ritratti attesi:** `assets/char/MAYA.png`, `SAMIR.png`, `LUCA.png` (oltre agli 8 del prologo). Sfondi nuovi: `street_evening`, `workplace`, `town_hall_office`, `playground` (placeholder CSS già pronti).

## Riferimenti (cartella padre, sola lettura)

`Design System - Justurbanities.md` (componenti P0, pattern, a11y) · `Piano di Lavoro - Demo Web.md` (visione generale) · `Documento operativo.docx` §3–6 (fonte dei dati) · `Visual Bible.docx` (stile).
