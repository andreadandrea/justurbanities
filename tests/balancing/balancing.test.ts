import { describe, expect, it } from "vitest";
import { balancingFileSchema, validateData } from "../../src/data/validation";
import balancingData from "../../src/data/balancing.json";
import { GameState } from "../../src/game/GameState";
import {
  PROMISE_KEPT_TRUST,
  PROMISE_BROKEN_TRUST,
  PROMISE_BROKEN_FRAG
} from "../../src/game/promise/PromiseManager";
import { neighbourhoodVitality, cityState } from "../../src/game/resources/ResourceManager";
import { INTERVENTION_BONUS } from "../../src/game/resources/DistrictVitality";

describe("balancing.json (task 9.4) — thresholds live in data", () => {
  it("validates against the schema", () => {
    const file = validateData("balancing.json", balancingFileSchema, balancingData);
    expect(file.vitality.states.awakening).toBeLessThan(file.vitality.states.thriving);
  });

  it("GameState starts from the sheet's values", () => {
    const state = new GameState();
    expect(state.resources).toEqual(balancingData.startingResources);
    state.resources.trust = 99;
    state.startNewGame("maya", "Kim", "they");
    expect(state.resources).toEqual(balancingData.startingResources);
  });

  it("promise scoring constants come from the sheet", () => {
    expect(PROMISE_KEPT_TRUST).toBe(balancingData.promises.keptTrust);
    expect(PROMISE_BROKEN_TRUST).toBe(balancingData.promises.brokenTrust);
    expect(PROMISE_BROKEN_FRAG).toBe(balancingData.promises.brokenFrag);
  });

  it("vitality formula and colour states follow the sheet", () => {
    const state = new GameState();
    const expected = Math.round(
      balancingData.vitality.base -
        balancingData.startingResources.fragmentationGlobal * balancingData.vitality.fragmentationWeight
    );
    expect(neighbourhoodVitality(state.resources)).toBe(expected);

    expect(cityState(balancingData.vitality.states.awakening - 1)).toBe("fragmented");
    expect(cityState(balancingData.vitality.states.awakening)).toBe("awakening");
    expect(cityState(balancingData.vitality.states.connected)).toBe("connected");
    expect(cityState(balancingData.vitality.states.thriving)).toBe("thriving");

    expect(INTERVENTION_BONUS).toBe(balancingData.vitality.interventionBonus);
  });
});
