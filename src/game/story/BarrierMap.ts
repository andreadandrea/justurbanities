import type { GameState } from "../GameState";
import type { EffectResolver } from "../effects/EffectResolver";

/** §4.2 — the five printed layers plus the physical blocks Samir meets. */
export type BarrierLayer = "stairs" | "fear" | "language" | "costs" | "schedules" | "physical";

/** A documentable lived-barrier spot in a district (data: districts.json). */
export type BarrierPin = { id: string; x: number; y: number; layer: BarrierLayer };

export const M22_QUEST_ID = "M22";
/** §4.2 — documenting three lived barriers completes the mission. */
export const M22_PINS_TARGET = 3;
/** §4.2 — "each documented barrier: Voice +1, max 3". */
const VOICE_CAP = 3;
const PINS_VAR = "barrier_pins";
/** ✳ §4.2 — Samir's ch.1 fence photo, when it exists, is the first pin. */
export const SEED_PIN_ID = "narrow_crossing_fence";

export function documentedVar(pinId: string): string {
  return `barrier_${pinId}_documented`;
}

/**
 * Chapter-2 Mission 2 "The Map Is Not the Territory" (Ben, §4.2): the
 * official map gets overlaid with lived barriers. Pins live in
 * districts.json; documenting one raises Voice (capped) and the third pin
 * completes the quest. All progress lives in GameState variables, so it
 * saves, restores and merges like every other story fact.
 */
export class BarrierMap {
  constructor(
    private readonly state: GameState,
    private readonly resolver: EffectResolver
  ) {}

  /** The mission gates every pin: nothing is documentable before/after. */
  active(): boolean {
    return this.resolver.check({ type: "questState", questId: M22_QUEST_ID, state: "active" });
  }

  documented(pinId: string): boolean {
    return this.state.variables[documentedVar(pinId)] === true;
  }

  pinsDocumented(): number {
    return Number(this.state.variables[PINS_VAR] ?? 0);
  }

  /**
   * Seed the first pin from chapter 1: Samir photographed the fence, so
   * the barrier is already documented — no extra Voice (the photo already
   * paid it in the route). Called whenever a dialogue ends, it becomes
   * true exactly once, right after Ben's briefing.
   */
  sync(): void {
    if (!this.active()) return;
    if (this.state.variables.fence_photographed !== true) return;
    if (this.documented(SEED_PIN_ID)) return;
    this.register(SEED_PIN_ID, "physical", false);
  }

  /** Document a pin the player interacted with. Returns false when inert. */
  document(pinId: string, layer: BarrierLayer): boolean {
    if (!this.active() || this.documented(pinId)) return false;
    this.register(pinId, layer, true);
    return true;
  }

  private register(pinId: string, layer: BarrierLayer, awardVoice: boolean): void {
    this.state.variables[documentedVar(pinId)] = true;
    const pins = this.pinsDocumented() + 1;
    this.state.variables[PINS_VAR] = pins;
    if (awardVoice && pins <= VOICE_CAP) {
      this.resolver.apply({ type: "addResource", key: "voice", value: 1 });
    }
    this.resolver.apply({
      type: "createProgressEvent",
      eventType: "barrier_pin",
      payload: { id: pinId, layer, pins }
    });
    if (pins >= M22_PINS_TARGET) {
      // Completing the only required objective completes M22 (and emits
      // quest_completed for the shared city).
      this.resolver.apply({ type: "completeObjective", questId: M22_QUEST_ID, objectiveId: "document_three" });
    }
  }
}
