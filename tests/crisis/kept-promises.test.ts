import { describe, expect, it } from "vitest";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { CrisisManager } from "../../src/game/crisis/CrisisManager";
import { PromiseManager, PROMISE_KEPT_TRUST } from "../../src/game/promise/PromiseManager";
import type { PromiseFile } from "../../src/game/promise/PromiseManager";
import { crisisFileSchema, promiseFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { CrisisFile } from "../../src/types/Crisis";
import type { QuestFile } from "../../src/types/Quest";
import crisesData from "../../src/data/crises.json";
import promisesData from "../../src/data/promises.json";
import questsData from "../../src/data/quests.json";

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const crises = new CrisisManager(state, resolver, () => {});
  const crisisFile = validateData("crises.json", crisisFileSchema, crisesData) as CrisisFile;
  crises.load(crisisFile);
  const promises = new PromiseManager(state);
  promises.load(validateData("promises.json", promiseFileSchema, promisesData) as PromiseFile);
  return { state, quests, resolver, crises, promises, crisisFile };
}

/** Raise resources so the given crisis resolves transformative. */
function maxResources(state: GameState) {
  for (const key of ["trust", "care", "commons", "voice", "resilience"] as const) {
    state.resources[key] = 99;
  }
}

describe("kept-promise triggers — crisis transformative outcomes", () => {
  it("every crisis names at least one registry promise to keep", () => {
    const w = world();
    const registry = new Set(
      (validateData("promises.json", promiseFileSchema, promisesData) as PromiseFile).promises.map((p) => p.id)
    );
    for (const crisis of w.crisisFile.crises) {
      expect(crisis.keepsPromises?.length, `${crisis.id} keeps nothing`).toBeGreaterThan(0);
      for (const promiseId of crisis.keepsPromises ?? []) {
        expect(registry.has(promiseId), `${crisis.id} keeps unknown ${promiseId}`).toBe(true);
      }
    }
  });

  it("a transformative outcome keeps the ACTIVE promise and PromiseManager scores it", () => {
    const w = world();
    maxResources(w.state);
    // quest conditions for transformative tiers
    for (const questId of ["N10", "N11", "N02", "N15", "N05", "N08", "N07", "N09", "N16"]) {
      w.quests.startQuest(questId);
      w.quests.completeQuest(questId);
    }
    w.state.variables.promiseSupportLonelyElders = "active";
    w.promises.evaluate(); // records madeOnDay

    const heatwave = w.crisisFile.crises.find((crisis) => crisis.id === "CRISIS_HEATWAVE")!;
    const resolution = w.crises.resolveDay(heatwave.day);
    expect(resolution?.tier).toBe("transformative");
    expect(w.state.variables.promiseSupportLonelyElders).toBe("kept");

    const trustBefore = w.state.resources.trust;
    w.promises.evaluate();
    expect(w.state.resources.trust - trustBefore).toBe(PROMISE_KEPT_TRUST);
  });

  it("never keeps a promise that was not made (or already broken)", () => {
    const w = world();
    maxResources(w.state);
    for (const questId of ["N10", "N11"]) {
      w.quests.startQuest(questId);
      w.quests.completeQuest(questId);
    }
    w.state.variables.promiseSaferCrossing = "broken";
    const heatwave = w.crisisFile.crises.find((crisis) => crisis.id === "CRISIS_HEATWAVE")!;
    w.crises.resolveDay(heatwave.day);
    expect(w.state.variables.promiseSupportLonelyElders).toBeUndefined();
    expect(w.state.variables.promiseSaferCrossing).toBe("broken");
  });

  it("reactive/coordinated outcomes keep nothing", () => {
    const w = world();
    w.state.variables.promiseSupportLonelyElders = "active";
    const heatwave = w.crisisFile.crises.find((crisis) => crisis.id === "CRISIS_HEATWAVE")!;
    const resolution = w.crises.resolveDay(heatwave.day);
    expect(resolution?.tier).not.toBe("transformative");
    expect(w.state.variables.promiseSupportLonelyElders).toBe("active");
  });
});
