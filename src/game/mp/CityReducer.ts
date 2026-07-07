import { PROMISE_KEPT_TRUST, PROMISE_BROKEN_TRUST, PROMISE_BROKEN_FRAG } from "../promise/PromiseManager";

/**
 * MP-1 (SPEC_Multiplayer §2): the shared city is an event-sourced fold.
 * Every client emits progress events; this reducer folds any ordering of
 * the same set into the SAME city state:
 *  - resource deltas are commutative increments (order-independent),
 *  - quest completions and crisis tiers are first-event-wins (replays and
 *    second finishers are ignored — the second player gets the graceful
 *    variant line, spec §3 ✳),
 *  - promises are per-player-owned (no write conflicts by construction).
 * Determinism comes from the total order (createdAt, userId, id) plus
 * dedupe by event id, so merged logs from two devices always agree.
 */

export type CityEvent = {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type SharedCity = {
  resources: Record<string, number>;
  /** questId → the first completion (the city remembers who got there). */
  quests: Record<string, { by: string; at: string }>;
  promises: Record<string, { owner: string; status: "kept" | "broken" }>;
  /** crisisId → tier of the first resolution event. */
  crises: Record<string, { tier: string }>;
  /** The signed plan (last assembly_plan event in the total order wins). */
  planMeasures: Array<{ measureId: string; owner: string }>;
  /** Distinct players that contributed at least one event. */
  contributors: string[];
};

/** Same starting point as GameState.resources — kept in one place here. */
export function baseCityResources(): Record<string, number> {
  return { trust: 0, care: 0, commons: 0, voice: 0, resilience: 0, fragmentationGlobal: 5 };
}

/** Total deterministic order: server time first, then player, then id. */
export function orderEvents(events: CityEvent[]): CityEvent[] {
  return [...events].sort(
    (a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.userId.localeCompare(b.userId) || a.id.localeCompare(b.id)
  );
}

export function reduceSharedCity(events: CityEvent[]): SharedCity {
  const city: SharedCity = {
    resources: baseCityResources(),
    quests: {},
    promises: {},
    crises: {},
    planMeasures: [],
    contributors: []
  };

  const seen = new Set<string>();
  for (const event of orderEvents(events)) {
    if (seen.has(event.id)) continue; // replays are ignored
    seen.add(event.id);
    if (!city.contributors.includes(event.userId)) city.contributors.push(event.userId);

    switch (event.type) {
      case "resource_delta": {
        const key = String(event.payload.key ?? "");
        const value = Number(event.payload.value ?? 0);
        if (key) city.resources[key] = (city.resources[key] ?? 0) + value;
        break;
      }
      case "quest_completed": {
        const questId = String(event.payload.questId ?? "");
        if (questId && !city.quests[questId]) {
          city.quests[questId] = { by: event.userId, at: event.createdAt };
        }
        break;
      }
      case "promise_kept": {
        const promiseId = String(event.payload.promiseId ?? "");
        if (promiseId && !city.promises[promiseId]) {
          city.promises[promiseId] = { owner: String(event.payload.owner ?? event.userId), status: "kept" };
          city.resources.trust += PROMISE_KEPT_TRUST;
        }
        break;
      }
      case "promise_broken": {
        const promiseId = String(event.payload.promiseId ?? "");
        if (promiseId && !city.promises[promiseId]) {
          city.promises[promiseId] = { owner: String(event.payload.owner ?? event.userId), status: "broken" };
          city.resources.trust += PROMISE_BROKEN_TRUST;
          city.resources.fragmentationGlobal += PROMISE_BROKEN_FRAG;
        }
        break;
      }
      case "crisis_resolved": {
        const crisisId = String(event.payload.crisisId ?? "");
        if (crisisId && !city.crises[crisisId]) {
          // Tier side-effects arrive as their own resource_delta events
          // (CrisisManager applies them through the EffectResolver), so the
          // reducer only records the outcome — no double counting.
          city.crises[crisisId] = { tier: String(event.payload.tier ?? "") };
        }
        break;
      }
      case "assembly_plan": {
        city.planMeasures = ((event.payload.measures as Array<Record<string, unknown>>) ?? []).map((measure) => ({
          measureId: String(measure.measureId ?? ""),
          owner: String(measure.owner ?? "")
        }));
        break;
      }
    }
  }

  return city;
}

/** True when this quest was already completed by SOMEONE ELSE — the hook
 *  for the graceful "someone got here before you" variant (spec §3 ✳). */
export function questTakenByOther(city: SharedCity, questId: string, playerId: string): boolean {
  const completion = city.quests[questId];
  return completion !== undefined && completion.by !== playerId;
}
