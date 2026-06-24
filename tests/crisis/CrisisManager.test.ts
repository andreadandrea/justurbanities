import { describe, expect, it } from "vitest";
import { CrisisManager } from "../../src/game/crisis/CrisisManager";
import { GameState } from "../../src/game/GameState";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { QuestManager } from "../../src/game/quest/QuestManager";
import type { QuestFile } from "../../src/types/Quest";
import type { CrisisFile } from "../../src/types/Crisis";
import questsData from "../../src/data/quests.json";
import crisesData from "../../src/data/crises.json";

function setup(): { manager: CrisisManager; state: GameState; quests: QuestManager } {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(questsData as unknown as QuestFile);
  const manager = new CrisisManager(new EffectResolver(state, quests), state);
  manager.load(crisesData as unknown as CrisisFile);
  return { manager, state, quests };
}

// CRISIS_HEATWAVE (day 1): buffers care+commons, transformative gated on N11.
const HEATWAVE = "CRISIS_HEATWAVE";
const heatwave = (crisesData as unknown as CrisisFile).crises.find((c) => c.id === HEATWAVE)!;

describe("CrisisManager", () => {
  it("falls back to the reactive tier when nothing has been built", () => {
    const { manager } = setup();
    expect(manager.resolve(heatwave)).toBe("reactive");
  });

  it("reaches coordinated when buffer resources clear the middle threshold", () => {
    const { manager, state } = setup();
    state.resources.care = 3;
    state.resources.commons = 4;
    expect(manager.resolve(heatwave)).toBe("coordinated");
  });

  it("requires both the resources AND the gated quest for transformative", () => {
    const { manager, state, quests } = setup();
    state.resources.care = 6;
    state.resources.commons = 6;
    // Resources are high enough but the gating quest (N11) is not completed yet.
    expect(manager.resolve(heatwave)).toBe("coordinated");

    quests.startQuest("N11");
    quests.completeQuest("N11");
    expect(manager.resolve(heatwave)).toBe("transformative");
  });

  it("stores the winning tier in the result variable", () => {
    const { manager, state } = setup();
    state.resources.care = 3;
    state.resources.commons = 3;
    manager.resolve(heatwave);
    expect(state.variables[heatwave.resultVariable]).toBe("coordinated");
  });

  it("resolveForDay resolves the day's crisis once and is idempotent", () => {
    const { manager, state } = setup();
    state.resources.care = 3;
    state.resources.commons = 3;

    const first = manager.resolveForDay(1);
    expect(first.map((r) => r.crisis.id)).toEqual([HEATWAVE]);
    expect(first[0].tier).toBe("coordinated");
    expect(manager.isResolved(heatwave)).toBe(true);

    // Even if resources later rise, the already-recorded outcome is not redone.
    state.resources.care = 9;
    state.resources.commons = 9;
    expect(manager.resolveForDay(1)).toEqual([]);
    expect(state.variables[heatwave.resultVariable]).toBe("coordinated");
  });

  it("indexes crises by their scheduled day", () => {
    const { manager } = setup();
    expect(manager.forDay(1).map((c) => c.id)).toEqual([HEATWAVE]);
    expect(manager.forDay(99)).toEqual([]);
  });
});
