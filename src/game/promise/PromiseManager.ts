import type { GameState } from "../GameState";
import balancing from "../../data/balancing.json";

export type PromiseDefinition = {
  id: string;
  owner: string;
  deadlineDays: number;
};

export type PromiseFile = {
  schema?: string;
  note?: string;
  promises: PromiseDefinition[];
};

export type PromiseStatus = "active" | "kept" | "broken";

export type PromiseView = {
  id: string;
  owner: string;
  status: PromiseStatus;
  madeOnDay: number;
  deadlineDay: number;
};

export type PromiseProgressLogger = (eventType: string, payload: Record<string, unknown>) => void;

const MADE_PREFIX = "promiseMadeDay_";
const SCORED_PREFIX = "promiseScored_";

/** Scoring values from the balancing sheet (task 9.4) — the MP city
 *  reducer imports these too, so there is a single source. */
export const PROMISE_KEPT_TRUST = balancing.promises.keptTrust;
export const PROMISE_BROKEN_TRUST = balancing.promises.brokenTrust;
export const PROMISE_BROKEN_FRAG = balancing.promises.brokenFrag;

/**
 * Promises system (ratified ✳): dialogue effects set the promise variable
 * to "active"; content marks it "kept". Past the deadline an active promise
 * breaks. Kept → Trust +3; broken → Trust −2, fragmentation +1 (district-
 * level Trust arrives with Phase 6.5 — applied globally until then).
 * All state lives in GameState.variables so saves need no extra plumbing.
 */
export class PromiseManager {
  private definitions: PromiseDefinition[] = [];

  constructor(
    private readonly state: GameState,
    private readonly logProgress?: PromiseProgressLogger
  ) {}

  load(file: PromiseFile): void {
    this.definitions = file.promises.map((definition) => ({ ...definition }));
  }

  /**
   * Re-evaluate all promises. Call on every clock event: captures the day a
   * promise was made, scores kept promises, breaks expired ones. Idempotent.
   */
  evaluate(): void {
    for (const definition of this.definitions) {
      const value = this.state.variables[definition.id];
      if (value === undefined) continue;

      const madeKey = `${MADE_PREFIX}${definition.id}`;
      if (this.state.variables[madeKey] === undefined) {
        this.state.variables[madeKey] = this.state.day;
      }

      const scoredKey = `${SCORED_PREFIX}${definition.id}`;
      if (this.state.variables[scoredKey] === true) continue;

      if (value === "kept") {
        this.state.resources.trust += PROMISE_KEPT_TRUST;
        this.state.variables[scoredKey] = true;
        this.logProgress?.("promise_kept", { promiseId: definition.id, owner: definition.owner });
        continue;
      }

      if (value === "active") {
        const madeOnDay = Number(this.state.variables[madeKey]);
        if (this.state.day > madeOnDay + definition.deadlineDays) {
          this.state.variables[definition.id] = "broken";
          this.state.resources.trust += PROMISE_BROKEN_TRUST;
          this.state.resources.fragmentationGlobal += PROMISE_BROKEN_FRAG;
          this.state.variables[scoredKey] = true;
          this.logProgress?.("promise_broken", { promiseId: definition.id, owner: definition.owner });
        }
      }
    }
  }

  /** Promises made so far, for the logbook (order: as defined). */
  list(): PromiseView[] {
    const views: PromiseView[] = [];
    for (const definition of this.definitions) {
      const value = this.state.variables[definition.id];
      if (value !== "active" && value !== "kept" && value !== "broken") continue;
      const madeOnDay = Number(this.state.variables[`${MADE_PREFIX}${definition.id}`] ?? this.state.day);
      views.push({
        id: definition.id,
        owner: definition.owner,
        status: value,
        madeOnDay,
        deadlineDay: madeOnDay + definition.deadlineDays
      });
    }
    return views;
  }
}
