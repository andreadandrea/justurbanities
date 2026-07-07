import { describe, expect, it } from "vitest";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { dialogueFileSchema, districtFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";
import districtsData from "../../src/data/districts.json";

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  const events: Array<{ type: string; payload?: Record<string, unknown> }> = [];
  resolver.setProgressEventHandler((type, payload) => events.push({ type, payload }));
  return { state, quests, resolver, dialogues, events };
}

describe("M24 — Useful, Not Beautiful (§4.4)", () => {
  it("Grey Yards carries the Courtyard 17 hotspot, gated on the active mission", () => {
    const districts = validateData("districts.json", districtFileSchema, districtsData);
    const greyYards = districts.districts.find((district) => district.id === "grey_yards");
    const poi = greyYards?.pois?.find((candidate) => candidate.id === "courtyard_17");
    expect(poi).toBeDefined();
    expect(poi?.dialogueId).toBe("courtyard_assessment");
    expect(poi?.conditions?.some((c) => c.type === "questState" && c.questId === "M24")).toBe(true);

    const w = world();
    expect(w.resolver.checkAll(poi?.conditions)).toBe(false); // locked mission hides it
    w.quests.startQuest("M24");
    expect(w.resolver.checkAll(poi?.conditions)).toBe(true);
    w.state.variables.m24_assessed = true;
    expect(w.resolver.checkAll(poi?.conditions)).toBe(false); // assessed once, gone
  });

  it("the four-axis sheet records verdicts and completes the mission", () => {
    const w = world();
    w.dialogues.start("sigrid_m24");
    w.dialogues.choose("engage");
    w.dialogues.choose("go");
    expect(w.quests.getQuestStatus("M24")).toBe("active");

    w.dialogues.start("courtyard_assessment");
    w.dialogues.choose("begin");
    w.dialogues.choose("works"); // aesthetic
    w.dialogues.choose("fails"); // social
    w.dialogues.choose("fails"); // practical
    w.dialogues.choose("fails"); // accessible
    w.dialogues.choose("close");

    expect(w.quests.getQuestStatus("M24")).toBe("completed");
    // §4.4 the result pre-fills ch.3 Mission 2's sheet — verdicts persist
    expect(w.state.variables).toMatchObject({
      m24_aesthetic: "works",
      m24_social: "fails",
      m24_practical: "fails",
      m24_accessible: "fails",
      m24_assessed: true
    });
    expect(w.events.filter((event) => event.type === "axis_assessed")).toHaveLength(4);
    expect(w.events.some((event) => event.type === "courtyard_assessed")).toBe(true);
  });

  it("walking away early leaves the sheet blank and the mission open", () => {
    const w = world();
    w.quests.startQuest("M24");
    w.dialogues.start("courtyard_assessment");
    w.dialogues.choose("leave");
    expect(w.quests.getQuestStatus("M24")).toBe("active");
    expect(w.state.variables.m24_assessed).toBeUndefined();
  });
});
