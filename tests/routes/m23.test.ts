import { describe, expect, it } from "vitest";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { activePlacements } from "../../src/game/npc/NpcSchedule";
import { dialogueFileSchema, questFileSchema, scheduleFileSchema, validateData } from "../../src/data/validation";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import type { ScheduleFile } from "../../src/types/Schedule";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";
import scheduleData from "../../src/data/schedule.json";

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  const schedule = validateData("schedule.json", scheduleFileSchema, scheduleData) as ScheduleFile;
  const events: Array<{ type: string; payload?: Record<string, unknown> }> = [];
  resolver.setProgressEventHandler((type, payload) => events.push({ type, payload }));
  return { state, quests, resolver, dialogues, schedule, events };
}

describe("M23 — Who Is Missing? (§4.3)", () => {
  it("Samir offers the mission at the Center once chapter 2 opens", () => {
    const w = world();
    const before = activePlacements(w.schedule, "community_center", 0, (c) => w.resolver.checkAll(c));
    expect(before.some((p) => p.dialogueId === "samir_m23")).toBe(false);
    w.state.variables.chapter2_unlocked = true;
    const after = activePlacements(w.schedule, "community_center", 0, (c) => w.resolver.checkAll(c));
    expect(after.some((p) => p.dialogueId === "samir_m23")).toBe(true);
  });

  it("crossing the three sources completes the mission and opens the hooks", () => {
    const w = world();
    w.dialogues.start("samir_m23");
    w.dialogues.choose("engage");
    w.dialogues.choose("go");
    expect(w.quests.getQuestStatus("M23")).toBe("active");

    for (const npc of ["pablo", "gwen", "amin"]) {
      w.dialogues.start(`${npc}_m23_source`);
      w.dialogues.choose("note");
    }

    expect(w.quests.getQuestStatus("M23")).toBe("completed");
    // §4.3 hooks: elders → N11, families without the language → N16, kids → N14
    expect(w.state.variables).toMatchObject({
      missing_group_elders: true,
      missing_group_no_language: true,
      missing_group_youth: true
    });
    const groups = w.events.filter((event) => event.type === "missing_group").map((event) => event.payload?.hook);
    expect(groups.sort()).toEqual(["N11", "N14", "N16"]);
  });

  it("each source speaks once: the placement retires after the note", () => {
    const w = world();
    w.state.variables.chapter2_unlocked = true;
    w.dialogues.start("samir_m23");
    w.dialogues.choose("engage");
    w.dialogues.choose("go");

    const pablosBefore = activePlacements(w.schedule, "old_blocks", 0, (c) => w.resolver.checkAll(c));
    expect(pablosBefore.find((p) => p.npcId === "pablo")?.dialogueId).toBe("pablo_m23_source");
    w.dialogues.start("pablo_m23_source");
    w.dialogues.choose("note");
    w.state.variables.prologue_complete = true;
    const pablosAfter = activePlacements(w.schedule, "old_blocks", 0, (c) => w.resolver.checkAll(c));
    expect(pablosAfter.find((p) => p.npcId === "pablo")?.dialogueId).toBe("pablo_n11");
  });

  it("Samir's resolution beat closes the mission arc once", () => {
    const w = world();
    w.dialogues.start("samir_m23");
    w.dialogues.choose("engage");
    w.dialogues.choose("go");
    for (const npc of ["pablo", "gwen", "amin"]) {
      w.dialogues.start(`${npc}_m23_source`);
      w.dialogues.choose("note");
    }
    const placements = activePlacements(w.schedule, "community_center", 0, (c) => w.resolver.checkAll(c));
    expect(placements.find((p) => p.npcId === "samir")?.dialogueId).toBe("samir_m23_resolution");
    w.dialogues.start("samir_m23_resolution");
    w.dialogues.choose("close");
    expect(w.state.variables.who_is_missing_done).toBe(true);
    const after = activePlacements(w.schedule, "community_center", 0, (c) => w.resolver.checkAll(c));
    expect(after.some((p) => p.npcId === "samir")).toBe(false);
  });
});
