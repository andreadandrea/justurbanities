import type { Condition } from "../../types/Dialogue";
import type { GameState } from "../GameState";
import type { EffectResolver } from "../effects/EffectResolver";

/** Optional gate on when a placed NPC is present. */
export type PlacementWhen = {
  /** Time parts the NPC is present in (0=morning, 1=afternoon, 2=evening). Omit = any part. */
  timeParts?: number[];
  /** Earliest day (inclusive) the NPC appears. Omit = from day 1. */
  dayMin?: number;
  /** Latest day (inclusive) the NPC appears. Omit = forever. */
  dayMax?: number;
  /** Story/quest/resource gates, reusing the dialogue Condition union. All must pass. */
  conditions?: Condition[];
};

/** A single data-driven NPC placement entry (from npc_placement.json). */
export type NpcPlacement = {
  npcId: string;
  scene: string;
  x: number;
  y: number;
  dialogueId: string;
  speakerLabel?: string;
  when?: PlacementWhen;
};

export type NpcPlacementFile = {
  placements: NpcPlacement[];
};

/**
 * Decides which NPCs should currently be present in a scene, given the day,
 * time part and story/quest state. Pure and easily testable: no rendering,
 * no side effects — it just filters placement entries.
 */
export class NpcDirector {
  constructor(private readonly placements: NpcPlacement[]) {}

  /** Placements for `sceneId` that pass their `when` gate right now. */
  npcsForScene(sceneId: string, state: GameState, effects: EffectResolver): NpcPlacement[] {
    return this.placements.filter(
      (placement) => placement.scene === sceneId && NpcDirector.isPresent(placement, state, effects)
    );
  }

  /** True when a single placement's `when` gate is satisfied by the given state. */
  static isPresent(placement: NpcPlacement, state: GameState, effects: EffectResolver): boolean {
    const when = placement.when;
    if (!when) return true;

    if (when.timeParts && !when.timeParts.includes(state.timePart)) return false;
    if (when.dayMin !== undefined && state.day < when.dayMin) return false;
    if (when.dayMax !== undefined && state.day > when.dayMax) return false;
    if (when.conditions && !effects.checkAll(when.conditions)) return false;

    return true;
  }
}
