import { describe, expect, it } from "vitest";
import {
  baseCityResources,
  orderEvents,
  questTakenByOther,
  reduceSharedCity,
  type CityEvent
} from "../../src/game/mp/CityReducer";
import {
  PROMISE_KEPT_TRUST,
  PROMISE_BROKEN_TRUST,
  PROMISE_BROKEN_FRAG
} from "../../src/game/promise/PromiseManager";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { questFileSchema, validateData } from "../../src/data/validation";
import type { QuestFile } from "../../src/types/Quest";
import questsData from "../../src/data/quests.json";

let counter = 0;
function event(userId: string, type: string, payload: Record<string, unknown>, createdAt: string): CityEvent {
  return { id: `e${++counter}-${userId}`, userId, type, payload, createdAt };
}

/** Fisher–Yates with a fixed seed — deterministic shuffles for the test. */
function shuffled<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) % 2147483648;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Two local profiles playing the same city on different devices (AC 8.1). */
function twoProfilesLog(): CityEvent[] {
  const A = "player-a";
  const B = "player-b";
  return [
    // A's morning: a quest with its reward increments.
    event(A, "resource_delta", { key: "voice", value: 1 }, "2026-07-07T09:00:00.000Z"),
    event(A, "resource_delta", { key: "trust", value: 1 }, "2026-07-07T09:00:01.000Z"),
    event(A, "quest_completed", { questId: "N01" }, "2026-07-07T09:00:02.000Z"),
    // B works elsewhere at the same time.
    event(B, "resource_delta", { key: "care", value: 2 }, "2026-07-07T09:00:00.500Z"),
    event(B, "quest_completed", { questId: "N02" }, "2026-07-07T09:01:00.000Z"),
    // Both attempt N05 — B's event lands first: first completion wins.
    event(B, "quest_completed", { questId: "N05" }, "2026-07-07T10:00:00.000Z"),
    event(A, "quest_completed", { questId: "N05" }, "2026-07-07T10:05:00.000Z"),
    // Promises are per-player-owned: no conflicts by construction.
    event(A, "promise_kept", { promiseId: "promiseSaferCrossing", owner: "ben" }, "2026-07-07T11:00:00.000Z"),
    event(B, "promise_broken", { promiseId: "promiseRepairDay", owner: "sigrid" }, "2026-07-07T11:30:00.000Z"),
    // Crisis day 1 resolves once for the whole city.
    event(A, "crisis_resolved", { crisisId: "CRISIS_HEATWAVE", tier: "coordinated" }, "2026-07-07T12:00:00.000Z"),
    event(B, "crisis_resolved", { crisisId: "CRISIS_HEATWAVE", tier: "reactive" }, "2026-07-07T12:00:30.000Z")
  ];
}

describe("MP-1 city reducer (SPEC_Multiplayer §2)", () => {
  it("two profiles merge deterministically — any arrival order, same city", () => {
    const log = twoProfilesLog();
    const reference = reduceSharedCity(log);
    for (const seed of [1, 7, 42, 1234]) {
      expect(reduceSharedCity(shuffled(log, seed))).toEqual(reference);
    }
  });

  it("resource increments are commutative sums over the base city", () => {
    const city = reduceSharedCity(twoProfilesLog());
    const base = baseCityResources();
    expect(city.resources.voice).toBe(base.voice + 1);
    expect(city.resources.care).toBe(base.care + 2);
    // trust: +1 (delta) +3 (kept) −2 (broken) over base 0
    expect(city.resources.trust).toBe(1 + PROMISE_KEPT_TRUST + PROMISE_BROKEN_TRUST);
    expect(city.resources.fragmentationGlobal).toBe(base.fragmentationGlobal + PROMISE_BROKEN_FRAG);
  });

  it("quest completion is first-event-wins; the second player is detectable", () => {
    const city = reduceSharedCity(twoProfilesLog());
    expect(city.quests.N05.by).toBe("player-b");
    expect(questTakenByOther(city, "N05", "player-a")).toBe(true);
    expect(questTakenByOther(city, "N05", "player-b")).toBe(false);
    expect(questTakenByOther(city, "N09", "player-a")).toBe(false); // untouched
  });

  it("crisis tiers are first-event-wins too (one city, one outcome)", () => {
    const city = reduceSharedCity(twoProfilesLog());
    expect(city.crises.CRISIS_HEATWAVE).toEqual({ tier: "coordinated" });
  });

  it("replayed events (same id) are ignored", () => {
    const log = twoProfilesLog();
    const withReplays = [...log, ...log.slice(0, 4).map((entry) => ({ ...entry }))];
    expect(reduceSharedCity(withReplays)).toEqual(reduceSharedCity(log));
  });

  it("ties on the timestamp break deterministically by player then id", () => {
    const tied = [
      event("player-b", "resource_delta", { key: "voice", value: 1 }, "2026-07-07T09:00:00.000Z"),
      event("player-a", "quest_completed", { questId: "N01" }, "2026-07-07T09:00:00.000Z")
    ];
    const [first] = orderEvents(tied);
    expect(first.userId).toBe("player-a");
  });

  it("the signed plan is the last assembly_plan in the total order", () => {
    const log = [
      event("player-a", "assembly_plan", { measures: [{ measureId: "m_care_rounds", owner: "pablo" }] }, "2026-07-07T15:00:00.000Z"),
      event(
        "player-a",
        "assembly_plan",
        { measures: [{ measureId: "m_open_courtyards", owner: "anna" }] },
        "2026-07-07T16:00:00.000Z"
      )
    ];
    for (const seed of [3, 99]) {
      const city = reduceSharedCity(shuffled(log, seed));
      expect(city.planMeasures).toEqual([{ measureId: "m_open_courtyards", owner: "anna" }]);
    }
  });

  it("tracks contributors", () => {
    const city = reduceSharedCity(twoProfilesLog());
    expect([...city.contributors].sort()).toEqual(["player-a", "player-b"]);
  });
});

describe("MP-1 event sourcing at the EffectResolver", () => {
  function resolverWorld() {
    const state = new GameState();
    const quests = new QuestManager();
    quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
    const resolver = new EffectResolver(state, quests);
    const emitted: Array<{ type: string; payload?: Record<string, unknown> }> = [];
    resolver.setProgressEventHandler((type, payload) => emitted.push({ type, payload }));
    return { state, quests, resolver, emitted };
  }

  it("addResource emits a commutative resource_delta event", () => {
    const w = resolverWorld();
    w.resolver.apply({ type: "addResource", key: "voice", value: 2 });
    expect(w.emitted).toEqual([{ type: "resource_delta", payload: { key: "voice", value: 2 } }]);
    expect(w.state.resources.voice).toBe(2);
  });

  it("quest completion emits quest_completed exactly once", () => {
    const w = resolverWorld();
    w.resolver.apply({ type: "startQuest", questId: "N01" });
    w.resolver.apply({ type: "completeQuest", questId: "N01" });
    w.resolver.apply({ type: "completeQuest", questId: "N01" }); // replay: silent
    const questEvents = w.emitted.filter((entry) => entry.type === "quest_completed");
    expect(questEvents).toEqual([{ type: "quest_completed", payload: { questId: "N01" } }]);
  });

  it("finishing the last objective also emits quest_completed", () => {
    const w = resolverWorld();
    w.resolver.apply({ type: "startQuest", questId: "P01" });
    w.resolver.apply({ type: "completeObjective", questId: "P01", objectiveId: "talk_to_anna" });
    w.resolver.apply({ type: "completeObjective", questId: "P01", objectiveId: "talk_to_ben" });
    const questEvents = w.emitted.filter((entry) => entry.type === "quest_completed");
    expect(questEvents).toEqual([{ type: "quest_completed", payload: { questId: "P01" } }]);
  });
});
