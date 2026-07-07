import { describe, expect, it } from "vitest";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { dialogueFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  return { state, quests, resolver, dialogues };
}

describe("M34 — Care Is Infrastructure (§5.4)", () => {
  it("a full kit activates all four elements, Care +1 each", () => {
    const w = world();
    const careBefore = w.state.resources.care;
    w.dialogues.start("maya_m34");
    w.dialogues.choose("engage");
    w.dialogues.choose("include"); // schedules
    w.dialogues.choose("include"); // kids_space
    w.dialogues.choose("include"); // rest_shifts
    w.dialogues.choose("include"); // accessibility (generic ramp)
    w.dialogues.choose("close");

    expect(w.quests.getQuestStatus("M34")).toBe("completed");
    expect(w.state.resources.care - careBefore).toBe(4);
    expect(w.state.variables).toMatchObject({
      careKit_schedules: true,
      careKit_kids_space: true,
      careKit_rest_shifts: true,
      careKit_accessibility: true,
      care_kit_ready: true
    });
    // §5.4 — attendance flows through the assembly's care thresholds:
    // e.g. Ben's invite fallback (care >= 3) is now reachable from 0.
    expect(w.resolver.check({ type: "resourceAtLeast", key: "care", value: careBefore + 4 })).toBe(true);
  });

  it("skipping everything still closes the mission — with an empty kit", () => {
    const w = world();
    const careBefore = w.state.resources.care;
    w.dialogues.start("maya_m34");
    w.dialogues.choose("engage");
    for (let i = 0; i < 4; i++) w.dialogues.choose("skip");
    w.dialogues.choose("close");
    expect(w.quests.getQuestStatus("M34")).toBe("completed");
    expect(w.state.resources.care).toBe(careBefore);
    expect(w.state.variables.careKit_schedules).toBeUndefined();
  });

  it("Ben builds the ramp himself only after N02 (his crossing) is completed", () => {
    const w = world();
    w.dialogues.start("maya_m34");
    w.dialogues.choose("engage");
    for (let i = 0; i < 3; i++) w.dialogues.choose("skip");
    const node = w.dialogues.getCurrentNode();
    expect(node.choices.map((choice) => choice.id)).toEqual(["include", "skip"]);

    const w2 = world();
    w2.quests.startQuest("N02");
    w2.quests.completeQuest("N02");
    w2.dialogues.start("maya_m34");
    w2.dialogues.choose("engage");
    for (let i = 0; i < 3; i++) w2.dialogues.choose("skip");
    const node2 = w2.dialogues.getCurrentNode();
    expect(node2.choices.map((choice) => choice.id)).toEqual(["ben_ramp", "include", "skip"]);
    w2.dialogues.choose("ben_ramp");
    w2.dialogues.choose("close");
    expect(w2.state.variables.careKit_ramp_by_ben).toBe(true);
    expect(w2.state.variables.careKit_accessibility).toBe(true);
  });
});
