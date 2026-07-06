import type { Resources } from "./ResourceManager";
import { neighbourhoodVitality } from "./ResourceManager";
import type { ScheduleFile } from "../../types/Schedule";

/** Vitality points each completed local intervention gives its district. */
export const INTERVENTION_BONUS = 8;

const QUEST_DIALOGUE = /_n\d\d$/;

/**
 * Which N-quests are anchored to which scene, derived from the schedule
 * (the quest offer's canonical district — single source of truth, so
 * moving an NPC moves the colour too).
 */
export function questAnchors(schedule: ScheduleFile): Map<string, string[]> {
  const anchors = new Map<string, string[]>();
  for (const placement of schedule.placements) {
    const match = QUEST_DIALOGUE.exec(placement.dialogueId);
    if (!match) continue;
    const questId = `N${placement.dialogueId.slice(-2)}`;
    const list = anchors.get(placement.scene) ?? [];
    if (!list.includes(questId)) {
      list.push(questId);
      anchors.set(placement.scene, list);
    }
  }
  return anchors;
}

/**
 * District-level Vitality (§5.8 "the first return of colour"): the global
 * fabric, plus a visible bonus for every completed intervention anchored
 * HERE. Repairs re-colour the district they touched — Fragmented →
 * Awakening happens street by street, not city-wide.
 */
export function districtVitality(
  sceneId: string,
  resources: Resources,
  anchors: Map<string, string[]>,
  questStatus: (questId: string) => string
): number {
  const base = neighbourhoodVitality(resources);
  const local = (anchors.get(sceneId) ?? []).filter((questId) => questStatus(questId) === "completed").length;
  return Math.min(100, base + local * INTERVENTION_BONUS);
}
