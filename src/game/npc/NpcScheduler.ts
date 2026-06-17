import type { TimePart } from "../time/GameClock";
import type { QuestStatus } from "../../types/Quest";

/**
 * Data-driven NPC placement (Gameplay Loop pillar 3 + "NPCs live on the
 * street and move"). NPCs appear, relocate or leave as the neighbourhood's
 * situation evolves — driven by **time of day, day number, quest state and
 * story variables**, never hardcoded in the scene classes.
 *
 * Each NPC lists ordered `placements`; for a given scene + context the
 * scheduler picks that NPC's *first* matching placement, so one NPC shows up
 * in at most one spot at a time and can relocate between scenes/parts.
 */

export type PlacementCondition = {
  /** Scene id this placement applies to. */
  scene: string;
  x: number;
  y: number;
  /** Dialogue to run on interaction. */
  dialogueId: string;
  /** Restrict to these parts of the day; omitted = any part. */
  parts?: TimePart[];
  /** Earliest / latest day this placement is active (inclusive). */
  minDay?: number;
  maxDay?: number;
  /** Story gate: only when a variable equals a value. */
  variableEquals?: { key: string; value: string | number | boolean };
  /** Quest gate: only when a quest is in a given state. */
  questState?: { questId: string; state: QuestStatus };
};

export type NpcDefinition = {
  id: string;
  /** Optional override; falls back to characters.json display name. */
  displayName?: string;
  placements: PlacementCondition[];
};

export type NpcsFile = { npcs: NpcDefinition[] };

export type ScheduleContext = {
  scene: string;
  day: number;
  part: TimePart;
  getVariable: (key: string) => string | number | boolean | undefined;
  getQuestStatus: (questId: string) => QuestStatus;
};

export type ActivePlacement = {
  npcId: string;
  displayName?: string;
  x: number;
  y: number;
  dialogueId: string;
};

function matches(placement: PlacementCondition, ctx: ScheduleContext): boolean {
  if (placement.scene !== ctx.scene) return false;
  if (placement.parts && !placement.parts.includes(ctx.part)) return false;
  if (placement.minDay !== undefined && ctx.day < placement.minDay) return false;
  if (placement.maxDay !== undefined && ctx.day > placement.maxDay) return false;
  if (placement.variableEquals && ctx.getVariable(placement.variableEquals.key) !== placement.variableEquals.value) {
    return false;
  }
  if (placement.questState && ctx.getQuestStatus(placement.questState.questId) !== placement.questState.state) {
    return false;
  }
  return true;
}

export class NpcScheduler {
  constructor(private readonly file: NpcsFile) {}

  /** Active NPC placements for a scene under the given context. */
  placementsFor(ctx: ScheduleContext): ActivePlacement[] {
    const active: ActivePlacement[] = [];
    for (const npc of this.file.npcs) {
      const placement = npc.placements.find((candidate) => matches(candidate, ctx));
      if (placement) {
        active.push({
          npcId: npc.id,
          displayName: npc.displayName,
          x: placement.x,
          y: placement.y,
          dialogueId: placement.dialogueId
        });
      }
    }
    return active;
  }

  /** Every NPC id referenced, so callers can preload their sprites. */
  allNpcIds(): string[] {
    return this.file.npcs.map((npc) => npc.id);
  }
}
