# Accessibility checklist (task 9.2)

Status of the accessibility pass. ✅ = implemented and verified, 🔶 = partial, ⬜ = open.
Re-run this checklist whenever a new UI surface ships.

## Keyboard-only play

- ✅ Player movement: arrow keys / WASD (`InputManager.axis`).
- ✅ Scene interaction: Enter / Space (`InputManager.consumeInteract`).
- ✅ Dialogue choices: number keys 1–9 pick the matching choice; each button
  is prefixed with its shortcut; focus lands on the first choice when a
  dialogue opens, so Tab/Enter also work.
- ✅ Typing guard: key presses inside `input`/`select`/`textarea`/`button`
  never move the player or fire a scene interaction.
- ✅ All panels (⚙ 📖 🏛 🖨 🧑‍🏫, offline, MP join, minigame) are plain
  buttons/selects/inputs — natively focusable and operable with Tab + Enter.
- ✅ Visible focus indicator: global `:focus-visible` outline (3px, offset).
- 🔶 Debug panel toggles with F3/backtick (dev tool, English-only by design).
- ⬜ Canvas hotspots (NPCs, doors) have no DOM mirror yet — keyboard players
  reach them by walking + Enter, but screen readers get nothing. Queued for
  the post-playtest pass.

## Text size

- ✅ Every `font-size` in `main.css` goes through `--font-scale`
  (guard test: `tests/a11y/accessibility.test.ts`).
- ✅ Options (⚙) → "Text size": 100% / 125% / 150%, persisted per device
  (Dexie `settings.fontScale`), applied before any UI shows.

## Contrast

- ✅ Base palette: dark ink `#2a2723` on parchment `#fff8ec` ≈ 12:1 (AA/AAA
  for body text).
- ✅ High-contrast mode (Options ⚙): pure black on white, 2px borders on all
  controls, muted greys lifted to `#333`; persisted per device.
- ✅ Status colours (kept/broken, valid/invalid) always ship with a text/icon
  cue (✓ ✗ · …) — never colour alone.

## Structure & semantics

- ✅ Panels are `<aside>` landmarks with `aria-label`s.
- ✅ Toggle buttons expose pressed state via `aria-pressed` where stateful
  (art-style measures, minigame pile).
- ✅ Decorative portraits have empty `alt`.
- ✅ Live-region announcements for resource changes (screen readers) — the HUD announces deltas ("Trust +1") and city-state transitions through a visually-hidden `aria-live="polite"` region (2026-07-07).

## How to verify

1. `npm run dev`, unplug the mouse: complete the prologue and one NPC quest.
2. Options ⚙ → set 150% + high contrast: replay a dialogue and open the
   logbook; every string must scale and stay legible.
3. `npm test` — `tests/a11y` enforces the font-scale plumbing.
