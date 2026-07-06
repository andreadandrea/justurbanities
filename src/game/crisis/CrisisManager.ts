import type { Crisis, CrisisFile, CrisisTier } from "../../types/Crisis";
import type { GameState } from "../GameState";
import type { EffectResolver } from "../effects/EffectResolver";

const TIER_ORDER: readonly CrisisTier[] = ["transformative", "coordinated", "reactive"];

export type CrisisResolution = {
  crisisId: string;
  day: number;
  tier: CrisisTier;
};

export type CrisisProgressLogger = (eventType: string, payload: Record<string, unknown>) => void;

/**
 * Crisis Week engine: each of days 1–5 carries one crisis. At the end of
 * the day the highest tier whose conditions all hold wins (transformative →
 * coordinated → reactive; reactive has no conditions, so something always
 * happens — the difference the players built beforehand decides how bad).
 * The outcome is written to the crisis' resultVariable, optional per-tier
 * data effects are applied, and a progress event is logged for the report.
 */
export class CrisisManager {
  private crises: Crisis[] = [];

  constructor(
    private readonly state: GameState,
    private readonly resolver: EffectResolver,
    private readonly logProgress?: CrisisProgressLogger
  ) {}

  load(file: CrisisFile): void {
    this.crises = file.crises.map((crisis) => structuredClone(crisis));
  }

  crisisForDay(weekDay: number): Crisis | undefined {
    return this.crises.find((crisis) => crisis.day === weekDay);
  }

  /** Pure evaluation: which tier would this crisis resolve at right now. */
  evaluateTier(crisis: Crisis): CrisisTier {
    const tier = TIER_ORDER.find((candidate) => this.resolver.checkAll(crisis.tiers[candidate].conditions));
    // reactive has an empty condition list, so find() can never miss.
    return tier ?? "reactive";
  }

  /** True once a crisis has been resolved (outcomes never re-roll). */
  isResolved(crisis: Crisis): boolean {
    return this.state.variables[crisis.resultVariable] !== undefined;
  }

  /**
   * Resolve the crisis of the given Crisis Week day (1–5), if any and not
   * already resolved. Applies the winning tier's effects and logs the
   * outcome for the educational report.
   */
  resolveDay(weekDay: number): CrisisResolution | undefined {
    const crisis = this.crisisForDay(weekDay);
    if (!crisis || this.isResolved(crisis)) return undefined;

    const tier = this.evaluateTier(crisis);
    this.state.variables[crisis.resultVariable] = tier;
    this.resolver.applyAll(crisis.tiers[tier].effects);
    this.logProgress?.("crisis_resolved", {
      crisisId: crisis.id,
      day: crisis.day,
      tier,
      convergingNeeds: crisis.convergingNeeds,
      bufferResources: crisis.bufferResources
    });

    return { crisisId: crisis.id, day: crisis.day, tier };
  }

  /** Resolutions so far, for report/debug surfaces. */
  resolutions(): CrisisResolution[] {
    return this.crises
      .filter((crisis) => this.isResolved(crisis))
      .map((crisis) => ({
        crisisId: crisis.id,
        day: crisis.day,
        tier: this.state.variables[crisis.resultVariable] as CrisisTier
      }));
  }
}
