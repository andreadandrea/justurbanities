import { describe, expect, it } from "vitest";
import { CrisisManager } from "../../src/game/crisis/CrisisManager";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { crisisFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { Crisis, CrisisFile } from "../../src/types/Crisis";
import type { QuestFile } from "../../src/types/Quest";
import crisesData from "../../src/data/crises.json";
import questsData from "../../src/data/quests.json";

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const manager = new CrisisManager(state, resolver, (type, payload) => events.push({ type, payload }));
  manager.load(validateData("crises.json", crisisFileSchema, crisesData) as CrisisFile);
  return { state, quests, resolver, manager, events };
}

const crisisFile = validateData("crises.json", crisisFileSchema, crisesData) as CrisisFile;

/** Satisfy every condition of a tier by construction, from the data itself. */
function satisfy(w: ReturnType<typeof world>, crisis: Crisis, tier: "transformative" | "coordinated"): void {
  for (const condition of crisis.tiers[tier].conditions) {
    if (condition.type === "resourceAtLeast") {
      w.state.resources[condition.key as keyof typeof w.state.resources] = condition.value;
    } else if (condition.type === "questState" && condition.state === "completed") {
      w.quests.completeQuest(condition.questId);
    } else if (condition.type === "variableEquals") {
      w.state.variables[condition.key] = condition.value;
    }
  }
}

describe("CrisisManager — all 5 crises × 3 tiers", () => {
  it("ships exactly the 5 canon crises on days 1–5", () => {
    expect(crisisFile.crises.map((c) => c.day).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(crisisFile.crises).toHaveLength(5);
  });

  for (const crisis of crisisFile.crises) {
    describe(crisis.id, () => {
      it("resolves reactive when the neighbourhood built nothing", () => {
        const w = world();
        const result = w.manager.resolveDay(crisis.day);
        expect(result).toEqual({ crisisId: crisis.id, day: crisis.day, tier: "reactive" });
        expect(w.state.variables[crisis.resultVariable]).toBe("reactive");
      });

      it("resolves coordinated when the buffer resources are woven", () => {
        const w = world();
        satisfy(w, crisis, "coordinated");
        expect(w.manager.resolveDay(crisis.day)?.tier).toBe("coordinated");
      });

      it("resolves transformative when resources AND the buffer quest are in place", () => {
        const w = world();
        satisfy(w, crisis, "transformative");
        expect(w.manager.resolveDay(crisis.day)?.tier).toBe("transformative");
      });
    });
  }
});

describe("CrisisManager mechanics", () => {
  it("a resolved crisis never re-rolls", () => {
    const w = world();
    expect(w.manager.resolveDay(1)?.tier).toBe("reactive");
    // even if the city improves afterwards, day 1 stays resolved
    w.state.resources.trust = 99;
    expect(w.manager.resolveDay(1)).toBeUndefined();
    expect(w.manager.resolutions()).toHaveLength(1);
  });

  it("days without a crisis resolve to nothing", () => {
    const w = world();
    expect(w.manager.resolveDay(6)).toBeUndefined();
    expect(w.manager.resolveDay(0)).toBeUndefined();
  });

  it("logs a progress event with the crisis outcome", () => {
    const w = world();
    w.manager.resolveDay(2);
    expect(w.events).toHaveLength(1);
    expect(w.events[0].type).toBe("crisis_resolved");
    expect(w.events[0].payload).toMatchObject({ day: 2, tier: "reactive" });
  });

  it("applies per-tier data effects when present", () => {
    const w = world();
    const synthetic: CrisisFile = {
      crises: [
        {
          id: "CRISIS_TEST",
          day: 1,
          title: "content.crises.CRISIS_TEST.title",
          type: "test",
          convergingNeeds: [],
          bufferResources: ["trust"],
          resultVariable: "testResolution",
          tiers: {
            transformative: { conditions: [{ type: "resourceAtLeast", key: "trust", value: 99 }] },
            coordinated: { conditions: [{ type: "resourceAtLeast", key: "trust", value: 50 }] },
            reactive: { conditions: [], effects: [{ type: "addResource", key: "fragmentationGlobal", value: 2 }] }
          }
        }
      ]
    };
    w.manager.load(synthetic);
    const before = w.state.resources.fragmentationGlobal;
    expect(w.manager.resolveDay(1)?.tier).toBe("reactive");
    expect(w.state.resources.fragmentationGlobal).toBe(before + 2);
  });

  it("transformative conditions in the shipped data all include a pre-built quest (resilience is built before)", () => {
    for (const crisis of crisisFile.crises) {
      const questConditions = crisis.tiers.transformative.conditions.filter((c) => c.type === "questState");
      expect(questConditions.length, `${crisis.id} transformative tier has no quest condition`).toBeGreaterThan(0);
    }
  });
});
