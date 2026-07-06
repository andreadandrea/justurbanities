import type { Condition } from "../../types/Dialogue";
import type { NpcPlacement, ScheduleFile } from "../../types/Schedule";

/**
 * Data-driven NPC placement: which NPCs are in a scene right now, given the
 * part of day and the game situation. Conditions are evaluated through the
 * caller's checker (EffectResolver.checkAll) so this stays a pure function.
 */
export function activePlacements(
  file: ScheduleFile,
  sceneId: string,
  timePart: number,
  checkConditions: (conditions?: Condition[]) => boolean
): NpcPlacement[] {
  return file.placements.filter(
    (placement) =>
      placement.scene === sceneId &&
      (!placement.timeParts || placement.timeParts.includes(timePart)) &&
      checkConditions(placement.conditions)
  );
}
