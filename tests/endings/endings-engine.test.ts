import { describe, expect, it } from "vitest";
import { computeEndingMetrics, resolveEnding } from "../../src/game/endings/EndingsEngine";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { endingsFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { EndingsFile } from "../../src/types/Endings";
import type { QuestFile } from "../../src/types/Quest";
import endingsData from "../../src/data/endings.json";
import questsData from "../../src/data/quests.json";
import crisesData from "../../src/data/crises.json";
import promisesData from "../../src/data/promises.json";

const endingsFile = validateData("endings.json", endingsFileSchema, endingsData) as EndingsFile;
const PROMISE_IDS = promisesData.promises.map((promise) => promise.id);
const CRISIS_RESULT_VARS = crisesData.crises.map((crisis) => crisis.resultVariable);

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const metrics = () =>
    computeEndingMetrics({
      state,
      questStatus: (questId) => quests.getQuestStatus(questId),
      promiseIds: PROMISE_IDS,
      crisisResultVars: CRISIS_RESULT_VARS
    });
  const ending = () => resolveEnding(endingsFile, metrics());
  return { state, quests, metrics, ending };
}

/** Shorthand: set resources by name. */
function setResources(state: GameState, values: Partial<GameState["resources"]>): void {
  Object.assign(state.resources, values);
}

describe("endings.json data", () => {
  it("ships the six §9 endings with one default", () => {
    expect(endingsFile.endings.map((ending) => ending.id)).toEqual([
      "thriving_network",
      "institutional_capture",
      "commons_without_voice",
      "resistance",
      "fragmented",
      "fragile_progress"
    ]);
    expect(endingsFile.endings.filter((ending) => ending.default).map((e) => e.id)).toEqual(["fragile_progress"]);
  });
});

describe("computeEndingMetrics", () => {
  it("computes R, T, reactive, P and n03 from the run", () => {
    const w = world();
    setResources(w.state, { trust: 6, care: 5, commons: 4, voice: 3, resilience: 2, fragmentationGlobal: 3 });
    w.state.variables.heatwaveResolution = "transformative";
    w.state.variables.rumorResolution = "reactive";
    w.state.variables.offerResolution = "transformative";
    w.state.variables.promiseSaferCrossing = "kept";
    w.state.variables.promiseRepairDay = "broken";
    const metrics = w.metrics();
    expect(metrics.R).toBe(20);
    expect(metrics.frag).toBe(3);
    expect(metrics.T).toBe(2);
    expect(metrics.reactive).toBe(1);
    expect(metrics.P).toBe(0.5);
    expect(metrics.n03).toBe("none");
    expect(metrics.trustCare).toBe(11);
  });

  it("P is neutral (1) when no promise was ever made", () => {
    const w = world();
    expect(w.metrics().P).toBe(1);
  });

  it("n03 distinguishes engage, shortcut and never-secured", () => {
    const w = world();
    expect(w.metrics().n03).toBe("none");
    w.quests.startQuest("N03");
    w.quests.completeQuest("N03");
    expect(w.metrics().n03).toBe("shortcut");
    w.state.variables.assemblyMandateReal = true;
    expect(w.metrics().n03).toBe("engage");
  });
});

describe("resolveEnding — each §9 ending is reachable", () => {
  it("9.1 Thriving Network", () => {
    const w = world();
    setResources(w.state, { trust: 7, care: 6, commons: 5, voice: 5, resilience: 4, fragmentationGlobal: 2 });
    w.state.variables.assemblyMandateReal = true;
    w.quests.startQuest("N03");
    w.quests.completeQuest("N03");
    w.state.variables.assemblyCoverage = 5;
    w.state.variables.promiseSaferCrossing = "kept";
    w.state.variables.promiseRepairDay = "kept";
    w.state.variables.promiseOpenInfoPoint = "kept";
    w.state.variables.promiseClimatePrep = "broken"; // 3/4 = 75%
    expect(w.ending()).toBe("thriving_network");
  });

  it("9.3 Institutional Capture — the shortcut route", () => {
    const w = world();
    setResources(w.state, { trust: 7, care: 4, commons: 2, voice: 4, resilience: 3, fragmentationGlobal: 5 });
    w.quests.startQuest("N03");
    w.quests.completeQuest("N03"); // no assemblyMandateReal → shortcut
    expect(w.ending()).toBe("institutional_capture");
  });

  it("9.3 Institutional Capture — the overpromise route", () => {
    const w = world();
    setResources(w.state, { trust: 7, care: 4, commons: 2, voice: 2, resilience: 3, fragmentationGlobal: 5 });
    w.state.variables.overpromise = true;
    expect(w.ending()).toBe("institutional_capture");
  });

  it("9.4 Commons Without Voice — painted walls, missing faces", () => {
    const w = world();
    setResources(w.state, { trust: 4, care: 4, commons: 7, voice: 2, resilience: 3, fragmentationGlobal: 4 });
    expect(w.ending()).toBe("commons_without_voice");
  });

  it("9.4 Commons Without Voice — two groups absent from the room", () => {
    const w = world();
    setResources(w.state, { trust: 5, care: 5, commons: 4, voice: 5, resilience: 4, fragmentationGlobal: 4 });
    w.state.variables.assemblyAbsentGroups = 2;
    expect(w.ending()).toBe("commons_without_voice");
  });

  it("9.5 Resistance — mandate denied, network holds", () => {
    const w = world();
    setResources(w.state, { trust: 7, care: 6, commons: 4, voice: 4, resilience: 3, fragmentationGlobal: 4 });
    w.state.variables.heatwaveResolution = "transformative";
    w.state.variables.floodResolution = "transformative";
    expect(w.metrics().n03).toBe("none");
    expect(w.ending()).toBe("resistance");
  });

  it("9.6 Fragmented — frictions win by habit", () => {
    const w = world();
    setResources(w.state, { trust: 2, care: 2, commons: 2, voice: 2, resilience: 2, fragmentationGlobal: 8 });
    expect(w.ending()).toBe("fragmented");
  });

  it("9.6 Fragmented — three reactive crises are enough on their own", () => {
    const w = world();
    setResources(w.state, { trust: 5, care: 5, commons: 4, voice: 5, resilience: 4, fragmentationGlobal: 6 });
    w.state.variables.heatwaveResolution = "reactive";
    w.state.variables.rumorResolution = "reactive";
    w.state.variables.closureResolution = "reactive";
    expect(w.ending()).toBe("fragmented");
  });

  it("9.2 Fragile Progress — the default middle", () => {
    const w = world();
    setResources(w.state, { trust: 4, care: 4, commons: 4, voice: 4, resilience: 2, fragmentationGlobal: 4 });
    w.state.variables.assemblyCoverage = 3;
    expect(w.ending()).toBe("fragile_progress");
  });

  it("a rich run with two groups left outside is NOT thriving (§9.4 over §9.1)", () => {
    const w = world();
    // Wealth does not override the empty chairs: thriving requires the room.
    setResources(w.state, { trust: 7, care: 6, commons: 5, voice: 5, resilience: 4, fragmentationGlobal: 2 });
    w.state.variables.assemblyMandateReal = true;
    w.state.variables.assemblyCoverage = 5;
    w.state.variables.assemblyAbsentGroups = 2;
    expect(w.ending()).toBe("commons_without_voice");
  });
});
