import type { Condition } from "./Dialogue";

/**
 * One NPC placement: where an NPC stands in a scene, when (parts of day)
 * and under which conditions, and which dialogue opens on interaction.
 * The same NPC can have many placements (different scenes/times/stages).
 */
export type NpcPlacement = {
  npcId: string;
  scene: string;
  position: { x: number; y: number };
  dialogueId: string;
  /** Parts of day (0 morning, 1 afternoon, 2 evening); omitted = always. */
  timeParts?: number[];
  /** All conditions must hold (questState, variables, resources); omitted = always. */
  conditions?: Condition[];
};

export type ScheduleFile = {
  schema?: string;
  note?: string;
  placements: NpcPlacement[];
};
