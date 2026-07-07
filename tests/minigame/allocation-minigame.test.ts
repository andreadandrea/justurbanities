import { describe, expect, it } from "vitest";
import { AllocationMinigame, type MinigameDefinition } from "../../src/game/minigame/AllocationMinigame";
import { minigamesFileSchema, validateData } from "../../src/data/validation";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import minigamesData from "../../src/data/minigames.json";

const file = validateData("minigames.json", minigamesFileSchema, minigamesData) as {
  minigames: Array<MinigameDefinition & { triggerVariable: string; doneVariable: string }>;
};
const REPAIR = file.minigames.find((minigame) => minigame.id === "modular_repair")!;

describe("minigames.json data (task 9.1)", () => {
  it("ships the Modular Repair pilot with 4 needs and enough materials", () => {
    expect(REPAIR).toBeDefined();
    expect(REPAIR.needs).toHaveLength(4);
    const slots = REPAIR.needs.reduce((sum, need) => sum + need.required, 0);
    expect(REPAIR.materials.length).toBeGreaterThanOrEqual(slots);
  });

  it("is fully solvable — a perfect Saturday exists", () => {
    const game = new AllocationMinigame(REPAIR);
    game.assign("pallet_wood", "bench");
    game.assign("old_door", "bench");
    game.assign("tarp", "shade");
    game.assign("rope", "shade");
    game.assign("bricks", "planter");
    game.assign("crates", "planter");
    game.assign("paint_cans", "noticeboard");
    game.assign("net_curtain", "noticeboard");
    expect(game.isComplete()).toBe(true);
    expect(game.score()).toBe(4);
  });
});

describe("AllocationMinigame — §5.2 rules", () => {
  it("tracks need status: empty → partial → valid", () => {
    const game = new AllocationMinigame(REPAIR);
    expect(game.needStatus("bench")).toBe("empty");
    game.assign("pallet_wood", "bench");
    expect(game.needStatus("bench")).toBe("partial");
    game.assign("crates", "bench");
    expect(game.needStatus("bench")).toBe("valid");
  });

  it("a wrong piece marks the need invalid — and going back is free", () => {
    const game = new AllocationMinigame(REPAIR);
    game.assign("tarp", "bench"); // cover on a wood need
    game.assign("pallet_wood", "bench");
    expect(game.needStatus("bench")).toBe("invalid");
    expect(game.score()).toBe(0);
    game.unassign("tarp"); // Sigrid corrects: again, wood forgives
    game.assign("old_door", "bench");
    expect(game.needStatus("bench")).toBe("valid");
  });

  it("a full need refuses extra pieces; moving a piece re-homes it", () => {
    const game = new AllocationMinigame(REPAIR);
    game.assign("pallet_wood", "bench");
    game.assign("old_door", "bench");
    expect(game.assign("crates", "bench")).toBe(false);
    // Moving old_door to the noticeboard frees the bench slot.
    expect(game.assign("old_door", "noticeboard")).toBe(true);
    expect(game.assigned("bench").map((material) => material.id)).toEqual(["pallet_wood"]);
  });

  it("finish applies the per-need reward once per valid combination", () => {
    const state = new GameState();
    const quests = new QuestManager();
    quests.load({ quests: [] });
    const resolver = new EffectResolver(state, quests);

    const game = new AllocationMinigame(REPAIR);
    game.assign("pallet_wood", "bench");
    game.assign("old_door", "bench");
    game.assign("tarp", "shade");
    game.assign("rope", "shade");
    // planter and noticeboard left undone: an imperfect Saturday still counts.
    const score = game.finish((effects) => resolver.applyAll(effects));
    expect(score).toBe(2);
    expect(state.resources.commons).toBe(2);
  });

  it("failing never punishes: zero valid needs, zero effects", () => {
    const state = new GameState();
    const quests = new QuestManager();
    quests.load({ quests: [] });
    const resolver = new EffectResolver(state, quests);
    const game = new AllocationMinigame(REPAIR);
    game.assign("tarp", "bench");
    const score = game.finish((effects) => resolver.applyAll(effects));
    expect(score).toBe(0);
    expect(state.resources.commons).toBe(0);
    expect(state.resources.fragmentationGlobal).toBe(5); // untouched
  });
});
