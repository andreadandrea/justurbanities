import type { Crisis, CrisisFile, CrisisTier } from "../../types/Crisis";
import type { GameState } from "../GameState";
import type { EffectResolver } from "../effects/EffectResolver";

/** Evaluated best-first: a more demanding tier wins when its conditions pass. */
const TIER_ORDER: CrisisTier[] = ["transformative", "coordinated", "reactive"];

export type CrisisResolution = { crisis: Crisis; tier: CrisisTier };

/**
 * Crisis Week logic. Each crisis is scheduled on a `day` and resolved at the
 * end of that day (see GameClock.onDayEnd). Resolution is pure with respect to
 * the engine vocabulary: it evaluates `tiers` in order transformative →
 * coordinated → reactive using the same `Condition`s as dialogues/quests
 * (via EffectResolver) and records the winning tier in
 * `GameState.variables[resultVariable]`. From there it flows into saves and the
 * educational report's observations. `reactive` has no conditions, so a tier is
 * always found — every crisis day yields at least the reactive outcome.
 */
export class CrisisManager {
  private readonly byDay = new Map<number, Crisis[]>();

  constructor(
    private readonly effectResolver: EffectResolver,
    private readonly gameState: GameState
  ) {}

  load(file: CrisisFile): void {
    this.byDay.clear();
    for (const crisis of file.crises) {
      const list = this.byDay.get(crisis.day) ?? [];
      list.push(crisis);
      this.byDay.set(crisis.day, list);
    }
  }

  /** Crises scheduled for a given day (empty if none). */
  forDay(day: number): Crisis[] {
    return this.byDay.get(day) ?? [];
  }

  /** True once a crisis has been resolved (its result variable is set). */
  isResolved(crisis: Crisis): boolean {
    return this.gameState.variables[crisis.resultVariable] !== undefined;
  }

  /**
   * Evaluate one crisis and store the winning tier. Returns that tier.
   * The highest tier whose conditions all pass wins; `reactive` is the floor.
   */
  resolve(crisis: Crisis): CrisisTier {
    const tier =
      TIER_ORDER.find((name) => this.effectResolver.checkAll(crisis.tiers[name].conditions)) ?? "reactive";
    this.gameState.variables[crisis.resultVariable] = tier;
    return tier;
  }

  /**
   * Resolve every not-yet-resolved crisis scheduled for `day`. Idempotent: a
   * crisis whose result variable is already set is skipped, so crossing the same
   * day boundary twice — or continuing a save past it — never re-resolves.
   */
  resolveForDay(day: number): CrisisResolution[] {
    const results: CrisisResolution[] = [];
    for (const crisis of this.forDay(day)) {
      if (this.isResolved(crisis)) continue;
      results.push({ crisis, tier: this.resolve(crisis) });
    }
    return results;
  }
}
