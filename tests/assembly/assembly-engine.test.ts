import { describe, expect, it } from "vitest";
import {
  AssemblyEngine,
  ASSEMBLY_READY_FLAG,
  ASSEMBLY_STATE_VAR,
} from "../../src/game/assembly/AssemblyEngine";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import {
  assemblyFileSchema,
  questFileSchema,
  validateData,
} from "../../src/data/validation";
import type { AssemblyFile, AssemblyPlanState } from "../../src/types/Assembly";
import type { QuestFile } from "../../src/types/Quest";
import assemblyData from "../../src/data/assembly.json";
import questsData from "../../src/data/quests.json";

const assemblyFile = validateData(
  "assembly.json",
  assemblyFileSchema,
  assemblyData,
) as AssemblyFile;

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(
    validateData("quests.json", questFileSchema, questsData) as QuestFile,
  );
  const resolver = new EffectResolver(state, quests);
  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const engine = new AssemblyEngine(
    state,
    (conditions) => resolver.checkAll(conditions),
    (effects) => resolver.applyAll(effects),
    (type, payload) => events.push({ type, payload }),
  );
  engine.load(assemblyFile);
  return { state, quests, resolver, engine, events };
}

/** A late-game state: interviews done, key quests completed, rich resources. */
function richWorld() {
  const w = world();
  Object.assign(w.state.variables, {
    [ASSEMBLY_READY_FLAG]: true,
    interview_viveca_done: true,
    interview_pablo_done: true,
    interview_gwen_done: true,
    maya_arrived_with_zoe: true,
    knowledge_table_held: true,
    offerResolution: "coordinated",
  });
  for (const questId of ["N02", "N05", "N09", "N11"]) {
    w.quests.startQuest(questId);
    w.quests.completeQuest(questId);
  }
  Object.assign(w.state.resources, {
    trust: 8,
    care: 8,
    commons: 8,
    voice: 8,
    resilience: 8,
  });
  return w;
}

describe("assembly.json data", () => {
  it("validates against the schema", () => {
    expect(assemblyFile.categories).toHaveLength(10);
    expect(assemblyFile.measures.length).toBeGreaterThanOrEqual(
      assemblyFile.categories.length,
    );
  });

  it("every category has at least one measure", () => {
    for (const category of assemblyFile.categories) {
      expect(
        assemblyFile.measures.some((measure) => measure.category === category),
        `category ${category} has no measures`,
      ).toBe(true);
    }
  });
});

describe("AssemblyEngine — opening", () => {
  it("does not begin until the ready flag is up", () => {
    const w = world();
    expect(w.engine.isReady).toBe(false);
    expect(w.engine.begin()).toBe(false);
    w.state.variables[ASSEMBLY_READY_FLAG] = true;
    expect(w.engine.begin()).toBe(true);
    expect(w.engine.phase).toBe("preparation");
  });
});

describe("AssemblyEngine — preparation (§7.1)", () => {
  it("offers only the stories the playthrough earned", () => {
    const w = richWorld();
    w.engine.begin();
    const storyIds = w.engine
      .availableStories("story")
      .map((story) => story.id);
    expect(storyIds).toContain("story_viveca");
    expect(storyIds).toContain("story_repair_day");
    expect(storyIds).not.toContain("story_samir_fence"); // samir never spoke
    const dataIds = w.engine.availableStories("data").map((story) => story.id);
    expect(dataIds).toContain("data_knowledge_table");
    expect(dataIds).not.toContain("data_commission");
  });

  it("rejects overfilled or unearned selections", () => {
    const w = richWorld();
    w.engine.begin();
    expect(
      w.engine.selectStories([
        "story_viveca",
        "story_pablo",
        "story_gwen",
        "story_zoe",
      ]),
    ).toBe(false);
    expect(w.engine.selectStories(["story_samir_fence"])).toBe(false);
    expect(
      w.engine.selectStories(["story_viveca", "story_pablo", "story_gwen"]),
    ).toBe(true);
  });

  it("records every empty slot as a 'what was missed' entry", () => {
    const w = richWorld();
    w.engine.begin();
    w.engine.selectStories(["story_viveca"]);
    w.engine.selectData([]);
    w.engine.enterRoom();
    expect(w.engine.plan.missedSlots).toEqual([
      "story",
      "story",
      "data",
      "data",
      "invite",
      "invite",
      "invite",
    ]);
  });
});

describe("AssemblyEngine — who is in the room (§7.2)", () => {
  it("computes presence from quests, variables and resources", () => {
    const w = richWorld();
    w.engine.begin();
    w.engine.enterRoom();
    const { present, absent } = w.engine.attendance();
    expect(present).toEqual(
      expect.arrayContaining([
        "anna",
        "alexandria",
        "ben",
        "gwen",
        "pablo",
        "sigrid",
        "zoe",
      ]),
    );
    const absentIds = absent.map((entry) => entry.npcId);
    expect(absentIds).toContain("tom"); // N08 untouched
    expect(absentIds).toContain("corporate_man"); // offer was coordinated, not alive
  });

  it("a personal invite relaxes the conditions", () => {
    const w = richWorld();
    w.engine.begin();
    expect(w.engine.invitable()).toContain("tom");
    w.engine.selectInvites(["tom"]);
    w.engine.enterRoom();
    expect(w.engine.attendance().present).toContain("tom"); // trust 8 ≥ 5
  });

  it("empty chairs carry names — and fully absent groups are counted", () => {
    const w = world();
    w.state.variables[ASSEMBLY_READY_FLAG] = true;
    w.engine.begin();
    w.engine.enterRoom();
    // Nothing done all game: only the unconditional attendees show up.
    expect(w.engine.attendance().present).toEqual(["anna", "alexandria"]);
    expect(w.engine.absentGroups()).toEqual(
      expect.arrayContaining([
        "elderly",
        "caregivers",
        "workers",
        "newcomers",
        "youth",
        "media",
        "business",
      ]),
    );
    expect(w.engine.absentGroups()).not.toContain("institutions"); // alexandria is there
  });
});

describe("AssemblyEngine — stories and tone (§7.3)", () => {
  it("plays each chosen story once and tracks heart vs numbers", () => {
    const w = richWorld();
    w.engine.begin();
    w.engine.selectStories(["story_viveca", "story_pablo", "story_gwen"]);
    w.engine.selectData([]);
    w.engine.enterRoom();
    w.engine.proceedToStories();
    expect(w.engine.playStory("story_viveca")).toBe(true);
    expect(w.engine.playStory("story_viveca")).toBe(false);
    expect(w.engine.proceedToConflicts()).toBe(false); // two still unplayed
    w.engine.playStory("story_pablo");
    w.engine.playStory("story_gwen");
    expect(w.engine.tone()).toBe("heart"); // 3 stories, 0 data, gap 2
    expect(w.engine.proceedToConflicts()).toBe(true);
  });
});

describe("AssemblyEngine — conflict table (§7.4)", () => {
  function atConflicts(
    overrides: Partial<Record<string, string | boolean>> = {},
  ) {
    const w = richWorld();
    Object.assign(w.state.variables, overrides);
    w.engine.begin();
    w.engine.selectStories(["story_viveca"]);
    w.engine.selectData(["data_knowledge_table"]);
    w.engine.enterRoom();
    w.engine.proceedToStories();
    w.engine.playStory("story_viveca");
    w.engine.playStory("data_knowledge_table");
    w.engine.proceedToConflicts();
    return w;
  }

  it("the investors conflict only fires while the Offer is alive", () => {
    const alive = atConflicts({ offerResolution: "reactive" });
    expect(
      alive.engine.activeConflicts().map((conflict) => conflict.id),
    ).toContain("residents_vs_investors");
    const transformed = atConflicts({ offerResolution: "transformative" });
    expect(
      transformed.engine.activeConflicts().map((conflict) => conflict.id),
    ).not.toContain("residents_vs_investors");
  });

  it("synthesis requires and spends resources; evasion is counted", () => {
    const w = atConflicts();
    w.state.resources.trust = 1; // synthesis on urgency_vs_procedure costs trust 2
    expect(w.engine.choosePosition("urgency_vs_procedure", "synthesis")).toBe(
      false,
    );
    w.state.resources.trust = 4;
    expect(w.engine.choosePosition("urgency_vs_procedure", "synthesis")).toBe(
      true,
    );
    // paid 2, effects give 1 back → 3
    expect(w.state.resources.trust).toBe(3);
    expect(w.engine.choosePosition("center_vs_network", "evade")).toBe(true);
    expect(w.engine.plan.evasions).toBe(1);
    expect(w.engine.proceedToPlan()).toBe(false); // investors conflict unresolved
    w.engine.choosePosition("residents_vs_investors", "residents");
    expect(w.engine.proceedToPlan()).toBe(true);
  });
});

describe("AssemblyEngine — plan and commitment (§7.5–7.6)", () => {
  function atPlan() {
    const w = richWorld();
    w.engine.begin();
    w.engine.selectStories(["story_viveca", "story_gwen"]);
    w.engine.selectData(["data_map_holes"]);
    w.engine.enterRoom();
    w.engine.proceedToStories();
    for (const id of ["story_viveca", "story_gwen", "data_map_holes"])
      w.engine.playStory(id);
    w.engine.proceedToConflicts();
    for (const conflict of w.engine.activeConflicts())
      w.engine.choosePosition(conflict.id, "evade");
    w.engine.proceedToPlan();
    return w;
  }

  it("a played story lowers the weight of its linked measures", () => {
    const w = atPlan();
    expect(w.engine.measureCost("m_open_courtyards")).toEqual({
      commons: 1,
      trust: 0,
    }); // viveca backs it
    expect(w.engine.measureCost("m_care_rounds")).toEqual({ care: 2 }); // pablo was not played
  });

  it("coverage counts distinct categories, not measures", () => {
    const w = atPlan();
    w.engine.addMeasure("m_open_courtyards");
    w.engine.addMeasure("m_common_room_hours"); // same category
    w.engine.addMeasure("m_bus_evening_run");
    expect(w.engine.coverage()).toBe(2);
  });

  it("commitments need a valid owner, deadline and verification", () => {
    const w = atPlan();
    w.engine.addMeasure("m_open_courtyards");
    w.engine.proceedToCommitment();
    expect(
      w.engine.commit("m_open_courtyards", {
        owner: "nobody",
        deadlineDays: 7,
        verification: "public_review",
      }),
    ).toBe(false);
    expect(
      w.engine.commit("m_open_courtyards", {
        owner: "anna",
        deadlineDays: 3,
        verification: "public_review",
      }),
    ).toBe(false);
    expect(
      w.engine.commit("m_open_courtyards", {
        owner: "anna",
        deadlineDays: 7,
        verification: "somehow",
      }),
    ).toBe(false);
    expect(
      w.engine.commit("m_open_courtyards", {
        owner: "anna",
        deadlineDays: 7,
        verification: "public_review",
      }),
    ).toBe(true);
    expect(w.engine.plan.measures.m_open_courtyards).toEqual({
      owner: "anna",
      deadlineDay: w.state.day + 7,
      verification: "public_review",
    });
  });

  it("the playable character can own a measure", () => {
    const w = atPlan();
    w.engine.addMeasure("m_care_rounds");
    w.engine.proceedToCommitment();
    expect(
      w.engine.commit("m_care_rounds", {
        owner: "maya",
        deadlineDays: 14,
        verification: "usage_count",
      }),
    ).toBe(true);
  });

  it("finalize refuses unsigned measures, then pays and summarizes", () => {
    const w = atPlan();
    w.engine.addMeasure("m_open_courtyards");
    w.engine.addMeasure("m_care_rounds");
    w.engine.proceedToCommitment();
    expect(w.engine.finalize()).toBe(false);
    w.engine.commit("m_open_courtyards", {
      owner: "anna",
      deadlineDays: 7,
      verification: "public_review",
    });
    w.engine.commit("m_care_rounds", {
      owner: "pablo",
      deadlineDays: 14,
      verification: "followup_assembly",
    });
    const care = w.state.resources.care;
    expect(w.engine.finalize()).toBe(true);
    expect(w.engine.phase).toBe("done");
    expect(w.state.resources.care).toBe(care - 2); // m_care_rounds, undiscounted
    expect(w.state.variables.assembly_complete).toBe(true);
    expect(w.state.variables.overpromise).toBe(false);
    expect(w.state.variables.assemblyCoverage).toBe(2);
    expect(w.state.variables.assemblyEvasions).toBe(3);
    const planEvent = w.events.find((event) => event.type === "assembly_plan");
    expect(planEvent).toBeDefined();
    expect(planEvent!.payload.coverage).toBe(2);
  });

  it("promising beyond the available resources raises overpromise", () => {
    const w = atPlan();
    for (const measure of assemblyFile.measures)
      w.engine.addMeasure(measure.id);
    w.engine.proceedToCommitment();
    for (const measure of assemblyFile.measures) {
      w.engine.commit(measure.id, {
        owner: "anna",
        deadlineDays: 30,
        verification: "public_review",
      });
    }
    expect(w.engine.finalize()).toBe(true);
    expect(w.state.variables.overpromise).toBe(true);
    expect(w.engine.coverage()).toBe(10);
    // Spending clamps at zero — no negative city.
    for (const value of Object.values(w.state.resources))
      expect(value).toBeGreaterThanOrEqual(0);
  });
});

describe("AssemblyEngine — serialization (AC 7.1)", () => {
  it("the plan travels with the save and resumes mid-assembly", () => {
    const w = atPlanForSave();
    const snapshot = w.state.snapshot();
    expect(typeof snapshot.variables[ASSEMBLY_STATE_VAR]).toBe("string");

    // A fresh world restores the snapshot: same phase, same plan.
    const w2 = world();
    w2.state.restore(snapshot);
    const engine2 = new AssemblyEngine(
      w2.state,
      (conditions) => w2.resolver.checkAll(conditions),
      (effects) => w2.resolver.applyAll(effects),
    );
    engine2.load(assemblyFile);
    expect(engine2.hasStarted).toBe(true);
    expect(engine2.phase).toBe("plan");
    expect(Object.keys(engine2.plan.measures)).toContain("m_open_courtyards");
    expect(engine2.plan.played).toContain("story_viveca");

    // …and the resumed engine can finish the assembly.
    engine2.addMeasure("m_care_rounds");
    engine2.proceedToCommitment();
    for (const measureId of Object.keys(engine2.plan.measures)) {
      engine2.commit(measureId, {
        owner: "anna",
        deadlineDays: 7,
        verification: "public_review",
      });
    }
    expect(engine2.finalize()).toBe(true);
    const finalPlan = JSON.parse(
      String(w2.state.variables[ASSEMBLY_STATE_VAR]),
    ) as AssemblyPlanState;
    expect(finalPlan.phase).toBe("done");
    expect(finalPlan.measures.m_open_courtyards?.owner).toBe("anna");
  });

  function atPlanForSave() {
    const w = richWorld();
    w.engine.begin();
    w.engine.selectStories(["story_viveca"]);
    w.engine.selectData([]);
    w.engine.enterRoom();
    w.engine.proceedToStories();
    w.engine.playStory("story_viveca");
    w.engine.proceedToConflicts();
    for (const conflict of w.engine.activeConflicts())
      w.engine.choosePosition(conflict.id, "evade");
    w.engine.proceedToPlan();
    w.engine.addMeasure("m_open_courtyards");
    return w;
  }
});
