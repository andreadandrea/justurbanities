import { describe, expect, it } from "vitest";
import { districtVitality, questAnchors, INTERVENTION_BONUS } from "../../src/game/resources/DistrictVitality";
import { cityState, neighbourhoodVitality } from "../../src/game/resources/ResourceManager";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { questFileSchema, scheduleFileSchema, validateData } from "../../src/data/validation";
import type { ScheduleFile } from "../../src/types/Schedule";
import type { QuestFile } from "../../src/types/Quest";
import scheduleData from "../../src/data/schedule.json";
import questsData from "../../src/data/quests.json";

const schedule = validateData("schedule.json", scheduleFileSchema, scheduleData) as ScheduleFile;
const anchors = questAnchors(schedule);

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const status = (questId: string) => quests.getQuestStatus(questId);
  return { state, quests, status };
}

describe("district-level vitality (task 6.5)", () => {
  it("anchors derive from the schedule (single source of truth)", () => {
    expect(anchors.get("old_blocks")).toEqual(expect.arrayContaining(["N05", "N11"]));
    expect(anchors.get("lake_edge")).toEqual(expect.arrayContaining(["N15", "N16"]));
    expect(anchors.get("grey_yards")).toEqual(expect.arrayContaining(["N08", "N18"]));
  });

  it("the ch.3 'first colour returns' moment: two repairs lift ONE district to Awakening", () => {
    const { state, quests, status } = world();
    // A fragmented city: resources low, pressure high.
    state.resources.fragmentationGlobal = 8;
    expect(cityState(neighbourhoodVitality(state.resources))).toBe("fragmented");

    // Two completed interventions in Old Blocks (Sigrid's Repair Day, Pablo's list).
    quests.completeQuest("N05");
    quests.completeQuest("N11");

    const oldBlocks = districtVitality("old_blocks", state.resources, anchors, status);
    const lakeEdge = districtVitality("lake_edge", state.resources, anchors, status);

    // The district touched warms up...
    expect(cityState(oldBlocks)).toBe("awakening");
    // ...while an untouched district stays cold. Street by street.
    expect(cityState(lakeEdge)).toBe("fragmented");
    expect(oldBlocks - lakeEdge).toBe(2 * INTERVENTION_BONUS);
  });

  it("a scene with no anchored quests tracks the global fabric", () => {
    const { state, status } = world();
    expect(districtVitality("nowhere", state.resources, anchors, status)).toBe(
      neighbourhoodVitality(state.resources)
    );
  });

  it("vitality caps at 100 even in a fully repaired district", () => {
    const { state, quests, status } = world();
    for (const key of ["trust", "care", "commons", "voice", "resilience"] as const) {
      state.resources[key] = 20;
    }
    state.resources.fragmentationGlobal = 0;
    quests.completeQuest("N05");
    quests.completeQuest("N11");
    expect(districtVitality("old_blocks", state.resources, anchors, status)).toBe(100);
  });
});
