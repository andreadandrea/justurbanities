import type { SharedCity } from "./CityReducer";
import type { GameState } from "../GameState";
import type { QuestManager } from "../quest/QuestManager";

/**
 * MP-3 (SPEC_Multiplayer §3): fold the shared city back into a local
 * client. The split is the spec's table — collective resources, quest
 * completions, crisis tiers, the promises board and the assembly story
 * pool are the city's; route progress, position and settings stay
 * personal (this function never touches them). Idempotent: applying the
 * same city twice is a no-op.
 */
export function applySharedCity(
  state: GameState,
  quests: QuestManager,
  city: SharedCity,
  /** crisisId → result variable (from crises.json). */
  crisisResultVars: Record<string, string>
): void {
  // Collective resources ARE the shared ones — replace, never add.
  Object.assign(state.resources, city.resources);

  // A quest completed by anyone is completed for the city. The second
  // finisher keeps their own dialogue memories; questTakenByOther() gives
  // scenes the graceful-variant hook (§3 ✳).
  for (const questId of Object.keys(city.quests)) {
    if (quests.has(questId) && quests.getQuestStatus(questId) !== "completed") {
      quests.completeQuest(questId);
    }
  }

  // Crisis Week is one week for one city: tiers land in the same result
  // variables single player uses, so endings and dialogue gates just work.
  for (const [crisisId, resolution] of Object.entries(city.crises)) {
    const resultVariable = crisisResultVars[crisisId];
    if (resultVariable) state.variables[resultVariable] = resolution.tier;
  }

  // The promises board is shared (owner visible). Marking them scored
  // stops the local PromiseManager from re-applying the Trust effects the
  // city resources already contain.
  for (const [promiseId, promise] of Object.entries(city.promises)) {
    state.variables[promiseId] = promise.status;
    state.variables[`promiseScored_${promiseId}`] = true;
  }

  // MP-3: the assembly reads everyone's listening — the union of empathy
  // maps unlocks stories the local player never collected alone.
  for (const [who, map] of Object.entries(city.empathyMaps)) {
    state.variables[`empathyMap_${who}`] = map.posture;
    state.variables[`interview_${who}_done`] = true;
  }
}
