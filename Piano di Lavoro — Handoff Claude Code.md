# Piano di Lavoro — Handoff a Claude Code
## Justurbanities Demo Web · Ciclo 1: Motore + Prologo

**Data:** 10 giugno 2026
**Cartella di lavoro per Code:** `demo/` (aprire Claude Code dentro `demo/` — lì c'è il `CLAUDE.md` con contratto dati, vincoli e verifica)

---

## Obiettivo del ciclo

Costruire il **motore visual-novel completo** e renderlo giocabile con il **prologo** (Quest P01 — *The Center Holds?*): narrazione di apertura → hub del Community Center → dialoghi con Anna + 5 mentor → mappa digitale con glitch Fragmentation → introduzione risorse collettive → messaggio di Alexandria → schermata di fine prologo.

**Non in scope in questo ciclo:** i 5 percorsi personaggio, l'assemblea, il report finale, gli sfondi generati, le icone risorse definitive. Arrivano nei cicli 2–3 (vedi Backlog).

## Cosa è già pronto (Code NON deve rifarlo)

| Asset | Dove | Stato |
|---|---|---|
| Grafo scene del prologo (50 nodi: dialoghi, scelte, effetti, condizioni) | `demo/data/scenes.json` | ✅ validato, nessun link rotto |
| Stato iniziale (risorse 0–100, flag, contatori — nomi dalla Variable List ufficiale) | `demo/data/state.json` | ✅ |
| Stringhe IT + EN (97 chiavi ciascuna) | `demo/data/locales/it.json`, `en.json` | ✅ |
| Stub DE, HU, PL, SV, RO (testo EN segnaposto, pronti per traduzione partner) | `demo/data/locales/` | ✅ |
| Design token (colori, type, spazi, raggi, ombre, motion, stati cromatici) | `demo/design-tokens.css` | ✅ |
| 8 ritratti personaggi (Anna, Ben, Giorgia, Sigrid, Ruben, Amin, Elena, Alexandria) | `demo/assets/char/` | ✅ |

**Mancano (per scelta):** sfondi → placeholder CSS con gradienti dai token; icone risorse → emoji (🤝 Trust, 🫶 Care, 🔑 Commons, 📣 Voice, 🪢 Resilience, ⚡ Fragmentation). Entrambi sostituibili dopo senza toccare il codice.

## Milestone

### M1 — Scaffold e stile base (½ giornata)
Creare `index.html`, `style.css` (che importa `design-tokens.css`), `game.js`. Layout: scena 16:9 centrata, layer sfondo, ritratto, dialogue box ancorato in basso, HUD risorse, switcher lingua in alto.
**Accettazione:** la pagina si apre da `file://`, mostra il primo nodo con placeholder sfondo e funziona senza errori in console.

### M2 — Motore core (1 giorno)
Loader di `scenes.json` + `state.json` + locale; render del nodo corrente (bg, ritratto, speaker, testo); avanzamento lineare (`next`) con click/Spazio/Invio; scelte con `effects` (`set`/`inc`) e `requires` (`eq`/`gte`, AND, scelte non soddisfatte nascoste); persistenza stato in `localStorage` + Restart.
**Accettazione:** playthrough completo del prologo possibile; l'hub mostra "Raggiungi Anna alla mappa" solo dopo Anna + 3 NPC; lo stato sopravvive al reload.

### M3 — Componenti P0 dal Design System (1 giorno)
Dialogue Box (varianti standard/narration, typing saltabile), Choice Button (tutti gli stati, incl. focus), Portrait Frame, Resource Meter ×5 + Fragmentation (con animazione increase/decrease e micro-etichetta +/−), System toast (nodi `type:system`), In-world Message (nodi `type:message`, variante visiva distinta, mittente esplicito), schermata `end`.
**Accettazione:** ogni componente usa solo token e classi `.ju-*`; specifiche e stati come da `Design System - Justurbanities.md` §4.1.

### M4 — Lingue (½ giornata)
Switcher 7 lingue (IT, EN, DE, HU, PL, SV, RO) con fallback a EN per chiavi mancanti; lingua persistita; cambio lingua a runtime senza perdere posizione nel grafo.
**Accettazione:** si gioca l'intero prologo in IT e in EN; le 5 lingue stub mostrano il testo EN senza errori.

### M5 — Accessibilità (½ giornata)
Checklist completa in `demo/CLAUDE.md` (tastiera, focus, target, contrasto, aria-live, `role="meter"`, `prefers-reduced-motion`, mai colore come unico segnale).
**Accettazione:** playthrough completo con sola tastiera; glitch mappa disattivato con reduced-motion; audit contrasto sui token usati.

### M6 — QA e consegna (½ giornata)
Eseguire lo script di verifica dati (in `demo/CLAUDE.md`); playthrough nei 3 percorsi-tipo (tutti gli NPC / solo 3 NPC / reload a metà); test su Chrome, Firefox e Safari da `file://`; aggiornare `demo/CLAUDE.md` con eventuali decisioni implementative prese.
**Accettazione:** zero errori console, zero riferimenti rotti, demo condivisibile come cartella zippata.

**Stima totale ciclo 1: ~4 giornate.**

## Regole vincolanti (riassunto — dettaglio in demo/CLAUDE.md)

1. Vanilla HTML/CSS/JS, **no framework, no build, no CDN** — deve girare da `file://`.
2. **Solo design token**, classi `.ju-*`, nessun valore hardcoded.
3. **Non modificare** `data/*` (generati dal Documento operativo §3) né i `.docx` della cartella padre.
4. Sfondi: prima cercare `assets/bg/<id>.png`, fallback placeholder CSS — così gli asset veri si inseriscono dopo senza codice.
5. Nomi variabili = Variable List ufficiale (camelCase EN): non rinominare.

## Backlog cicli successivi (non iniziare senza conferma di Andrea)

- **Ciclo 2 — Same City, Different Routes:** estensione di `scenes.json` ai 5 percorsi (Maya, Samir, Elena, Luca, Custom) + selettore personaggio + flag `*ArrivedAssembly` (i dati li preparerà Andrea/Claude come per il prologo).
- **Ciclo 3 — Assemblea + Report:** scena assemblea con presenze variabili, scelta priorità (sblocco Crossroads), report finale a 3 liste (*Who arrived / What changed / What was missed* — Documento operativo §23), teaser Crossroads.
- **Parallelo (non-Code):** generazione sfondi e key visual (Prompt Bible), icone risorse, traduzioni DE/HU/PL/SV/RO da parte dei partner, regolazione hex dei token sul key visual approvato.

## Prompt di avvio suggerito per Claude Code

> Leggi CLAUDE.md e poi il piano in "../Piano di Lavoro — Handoff Claude Code.md". Esegui il Ciclo 1, milestone M1–M6 in ordine. Dopo ogni milestone fermati, esegui i criteri di accettazione e riporta l'esito prima di proseguire. Non toccare data/ né i .docx.
