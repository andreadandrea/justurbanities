import { describe, expect, it } from "vitest";
import { reduceSharedCity, questTakenByOther, type CityEvent } from "../../src/game/mp/CityReducer";
import { applySharedCity } from "../../src/game/mp/SharedCityApplier";
import { AssemblyEngine, ASSEMBLY_READY_FLAG } from "../../src/game/assembly/AssemblyEngine";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { assemblyFileSchema, crisisFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { AssemblyFile } from "../../src/types/Assembly";
import type { CrisisFile } from "../../src/types/Crisis";
import type { QuestFile } from "../../src/types/Quest";
import assemblyData from "../../src/data/assembly.json";
import crisesData from "../../src/data/crises.json";
import questsData from "../../src/data/quests.json";

const assemblyFile = validateData("assembly.json", assemblyFileSchema, assemblyData) as AssemblyFile;
const crisisFile = validateData("crises.json", crisisFileSchema, crisesData) as CrisisFile;
const CRISIS_VARS = Object.fromEntries(crisisFile.crises.map((crisis) => [crisis.id, crisis.resultVariable]));

/** A device: local world whose EffectResolver feeds the session event log. */
function device(playerId: string, log: CityEvent[], clock: { now: number }) {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  let counter = 0;
  resolver.setProgressEventHandler((type, payload) => {
    log.push({
      id: `${playerId}-${++counter}`,
      userId: playerId,
      type,
      payload: payload ?? {},
      createdAt: new Date(clock.now++).toISOString()
    });
  });
  return { playerId, state, quests, resolver };
}

describe("MP-3 shared city (task 8.3): 2-player async session, ch.1 → assembly", () => {
  it("aggregates both players' work and completes a shared assembly", () => {
    const log: CityEvent[] = [];
    const clock = { now: Date.parse("2026-07-07T09:00:00.000Z") };
    const anna = device("device-anna", log, clock);
    const bruno = device("device-bruno", log, clock);

    // — Player A's days: Anna's mission (N01) and two interviews.
    anna.resolver.applyAll([
      { type: "startQuest", questId: "N01" },
      { type: "addResource", key: "voice", value: 1 },
      { type: "addResource", key: "trust", value: 1 },
      { type: "completeQuest", questId: "N01" },
      { type: "createProgressEvent", eventType: "empathy_map", payload: { who: "viveca", posture: "silence" } },
      { type: "createProgressEvent", eventType: "empathy_map", payload: { who: "pablo", posture: "ask" } },
      { type: "setVariable", key: "interview_viveca_done", value: true },
      { type: "setVariable", key: "interview_pablo_done", value: true }
    ]);

    // — Player B, another device, other days: Ben's crossing, the Repair
    //   Day, Gwen's interview, and the first crisis resolved for the city.
    bruno.resolver.applyAll([
      { type: "startQuest", questId: "N02" },
      { type: "addResource", key: "care", value: 2 },
      { type: "addResource", key: "resilience", value: 1 },
      { type: "completeQuest", questId: "N02" },
      { type: "startQuest", questId: "N05" },
      { type: "addResource", key: "commons", value: 2 },
      { type: "completeQuest", questId: "N05" },
      { type: "createProgressEvent", eventType: "empathy_map", payload: { who: "gwen", posture: "rephrase" } },
      { type: "setVariable", key: "interview_gwen_done", value: true },
      {
        type: "createProgressEvent",
        eventType: "crisis_resolved",
        payload: { crisisId: "CRISIS_HEATWAVE", tier: "transformative" }
      }
    ]);

    // Both attempt N09: whoever's event lands first takes it for the city.
    bruno.resolver.applyAll([
      { type: "startQuest", questId: "N09" },
      { type: "addResource", key: "voice", value: 2 },
      { type: "completeQuest", questId: "N09" }
    ]);
    anna.resolver.applyAll([
      { type: "startQuest", questId: "N09" },
      { type: "completeQuest", questId: "N09" }
    ]);

    // — The server orders the log; every client folds the SAME city.
    const city = reduceSharedCity(log);
    expect(city.contributors.sort()).toEqual(["device-anna", "device-bruno"]);
    expect(city.quests.N09.by).toBe("device-bruno");
    expect(questTakenByOther(city, "N09", "device-anna")).toBe(true);
    // Commutative sums: voice 1(A) + 2(B) + delta from N09... only deltas count.
    expect(city.resources.voice).toBe(3);
    expect(city.resources.care).toBe(2);
    expect(city.resources.commons).toBe(2);
    expect(city.empathyMaps.gwen).toEqual({ posture: "rephrase", by: "device-bruno" });

    // — Player A's client applies the shared city…
    applySharedCity(anna.state, anna.quests, city, CRISIS_VARS);
    expect(anna.quests.getQuestStatus("N02")).toBe("completed"); // B's work
    expect(anna.quests.getQuestStatus("N05")).toBe("completed");
    expect(anna.state.variables.heatwaveResolution).toBe("transformative");
    expect(anna.state.variables.interview_gwen_done).toBe(true); // B's listening
    expect(anna.state.resources.voice).toBe(3);

    // …and applying twice changes nothing (idempotent).
    const snapshot = JSON.stringify({ v: anna.state.variables, r: anna.state.resources });
    applySharedCity(anna.state, anna.quests, city, CRISIS_VARS);
    expect(JSON.stringify({ v: anna.state.variables, r: anna.state.resources })).toBe(snapshot);

    // — The assembly on A's device now draws from EVERYONE's playthrough.
    anna.state.variables[ASSEMBLY_READY_FLAG] = true;
    Object.assign(anna.state.resources, { trust: 6, voice: 6, commons: 6, care: 6, resilience: 6 });
    let assemblyEventCounter = 0;
    const engine = new AssemblyEngine(
      anna.state,
      (conditions) => anna.resolver.checkAll(conditions),
      (effects) => anna.resolver.applyAll(effects),
      (type, payload) =>
        log.push({
          id: `assembly-${++assemblyEventCounter}`,
          userId: anna.playerId,
          type,
          payload,
          createdAt: new Date(clock.now++).toISOString()
        })
    );
    engine.load(assemblyFile);
    engine.begin();

    const storyIds = engine.availableStories("story").map((story) => story.id);
    expect(storyIds).toEqual(expect.arrayContaining(["story_viveca", "story_pablo", "story_gwen", "story_repair_day"]));

    engine.selectStories(["story_viveca", "story_gwen", "story_repair_day"]);
    engine.selectData([]);
    engine.enterRoom();
    // B's quests seat B's NPCs in A's room: one city, one attendance.
    expect(engine.attendance().present).toEqual(
      expect.arrayContaining(["anna", "alexandria", "ben", "sigrid", "gwen"])
    );

    engine.proceedToStories();
    for (const id of ["story_viveca", "story_gwen", "story_repair_day"]) engine.playStory(id);
    engine.proceedToConflicts();
    for (const conflict of engine.activeConflicts()) engine.choosePosition(conflict.id, "evade");
    engine.proceedToPlan();
    engine.addMeasure("m_bus_evening_run");
    engine.addMeasure("m_repair_workshop");
    engine.proceedToCommitment();
    engine.commit("m_bus_evening_run", { owner: "gwen", deadlineDays: 14, verification: "usage_count" });
    engine.commit("m_repair_workshop", { owner: "sigrid", deadlineDays: 30, verification: "followup_assembly" });
    expect(engine.finalize()).toBe(true);

    // The signed plan is in A's save — and in the shared log for everyone.
    expect(anna.state.variables.assembly_complete).toBe(true);
    const finalCity = reduceSharedCity(log);
    expect(finalCity.planMeasures).toEqual([
      { measureId: "m_bus_evening_run", owner: "gwen" },
      { measureId: "m_repair_workshop", owner: "sigrid" }
    ]);
  });

  it("shared promises arrive scored — no local double counting", () => {
    const log: CityEvent[] = [];
    const clock = { now: Date.parse("2026-07-07T09:00:00.000Z") };
    const a = device("device-a", log, clock);
    a.resolver.apply({
      type: "createProgressEvent",
      eventType: "promise_kept",
      payload: { promiseId: "promiseSaferCrossing", owner: "ben" }
    });

    const city = reduceSharedCity(log);
    const client = device("device-b", [], clock);
    applySharedCity(client.state, client.quests, city, CRISIS_VARS);

    expect(client.state.variables.promiseSaferCrossing).toBe("kept");
    expect(client.state.variables.promiseScored_promiseSaferCrossing).toBe(true);
    // Trust +3 came with the city resources, not from a local re-score.
    expect(client.state.resources.trust).toBe(3);
  });
});
