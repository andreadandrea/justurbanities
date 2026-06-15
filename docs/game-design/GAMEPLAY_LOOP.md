# Gameplay Loop — Vivarium-inspired civic life-sim

> Design pillar. Defines the moment-to-moment loop of *Justurbanities*,
> adapting the cozy life-sim structure of **Vivarium** (Studio
> Meadowflower / Serenity Forge) to our core theme — see `CORE_THEME.md`.

## Reference & adaptation

Vivarium's loop: explore a small contained world, **help neighbours via
quests**, solve light environmental puzzles, tend a home/garden, over a
**cycle of days with dynamic time**, while a **branching narrative** shaped
by your choices changes the town and its endings — and a central living
symbol (a tree sprout) **visibly grows as you help others**.

We keep that cozy, relational, choice-driven structure and bend every
element toward civic participation against the Poly Crisis (lived as
**Fragmentation**). You are not a hero saving the world; you are a
neighbour re-weaving local fabric, one day and one relationship at a time.

## The four pillars (agreed direction)

### 1. The living fabric (heals & re-colours)
The **whole city** is the "living symbol" — not a single building. A derived
**Neighbourhood Vitality** (from the collective resources minus
Fragmentation pressure) drives how the entire scene looks: warm and
saturated across the city when connected, cold and desaturated everywhere
when fragmented. Helping people and places visibly brings colour back to
the city as a whole. This is Vivarium's growing sprout, re-cast as a city
coming back to life.

### 2. Day / time cycle
Play unfolds over **days**, each with parts (morning / afternoon /
evening). NPCs are **available at different times** — Samir only after his
shift, Luca around childcare — and the **assembly is a deadline**. Time
makes "who can show up, and when" a real, felt constraint: *arriving is
already participation*.

### 3. Neighbour quests (cozy civic acts)
A loop of small, human civic tasks: listen, connect people, fix a shared
thing, carry a message, notice a barrier. Completing them mends specific
resources and nudges Vitality. Slice-of-life scale, never heroics.

### 4. Choices → branching endings
Conversations and quest outcomes change people, the neighbourhood and the
final **educational report** (*who arrived / what changed / what was
missed*). No victory screen — an honest mirror of the civic fabric built.

## Presentation & point of view

- **3/4 follow camera** in a world larger than the viewport (Vivarium/
  Stardew-like). Implemented: `Camera2D` + animated directional character
  sprites (walk/idle in four directions) driven from `animations.json`.
- **Keep our hand-painted identity, but lean vivid** — higher saturation,
  warmer ground; the city looks brighter as it reconnects.
- **NPCs live on the street and move.** Their positions change by **story,
  time of day and quest state** — people appear, relocate or leave as the
  neighbourhood's situation evolves. (Builds on pillars 2–3; data-driven
  placement per scene/time/quest.)
- Dialogues show the **speaker portrait** (four expressions) + name plate
  + organized choices. *(next presentation slice)*

## Phased plan

1. **Living fabric v1** — `ResourceManager` (derive Vitality + state),
   resource HUD, scene colour-state reacting live to resources. *(this slice)*
2. **Day/time v1** — `GameClock` (day + part-of-day), HUD indicator,
   advancing time on key actions; persisted in the save.
3. **NPC availability** — schedules in data; NPCs present/absent by time;
   the assembly as a dated deadline.
4. **Quest loop v1** — a small data-driven quest board of neighbour tasks
   with resource rewards feeding Vitality.
5. **Branching & endings** — consequence flags shaping the report and an
   ending screen.

Each phase ships as its own tested, deployed increment, as before.

## Invariants (do not break)

- Data-driven content (JSON + zod), offline-first, no framework, accessible
  HTML overlays — per `AGENTS.md`.
- Resources are **social fabric**, not score; framing stays relational.
- The horizon stays open: civic action is ongoing, endings are mirrors.
