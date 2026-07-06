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
  return { state, quests, dialogues };
}

describe("E01 — Experts of Everyday Life (✳ Mission 7, outcome 7)", () => {
  it("ships in quests.json with the registry note", () => {
    const quests = validateData("quests.json", questFileSchema, questsData) as QuestFile;
    const e01 = quests.quests.find((q) => q.id === "E01");
    expect(e01).toBeDefined();
    expect(e01?.meta?.registry).toMatch(/outcome 7/i);
  });

  it("empathy maps are stored and reusable: 3 interviews, posture recorded", () => {
    const w = world();
    w.dialogues.start("interview_viveca");
    w.dialogues.choose("silence");
    w.dialogues.start("interview_pablo");
    w.dialogues.choose("ask");
    w.dialogues.start("interview_gwen");
    w.dialogues.choose("rephrase");
    expect(w.state.variables).toMatchObject({
      empathyMap_viveca: "silence",
      empathyMap_pablo: "ask",
      empathyMap_gwen: "rephrase",
      interview_viveca_done: true,
      interview_pablo_done: true,
      interview_gwen_done: true
    });
    // reusable: they survive the save (ch.5 rereads them)
    const restored = new GameState();
    restored.restore(w.state.snapshot());
    expect(restored.variables.empathyMap_viveca).toBe("silence");
  });

  it("N01 (Mission 1) completes through the interviews, not on engage", () => {
    const w = world();
    w.dialogues.start("anna_n01");
    w.dialogues.choose("engage");
    expect(w.quests.getQuestStatus("N01")).toBe("active");
    for (const id of ["interview_viveca", "interview_pablo", "interview_gwen"]) {
      w.dialogues.start(id);
      w.dialogues.choose("ask");
    }
    w.dialogues.start("anna_n01_resolution");
    w.dialogues.choose("close");
    expect(w.quests.getQuestStatus("N01")).toBe("completed");
    expect(w.state.variables.listenBeforeFixingDone).toBe(true);
  });

  it("the knowledge table needs all three maps; otherwise it shows the cost", () => {
    const w = world();
    const start = w.dialogues.start("elena_e01");
    expect(start.choices.map((c) => c.id)).toEqual(["too_few"]);
    w.dialogues.choose("too_few");
    w.dialogues.choose("close");
    expect(w.quests.getQuestStatus("E01")).toBe("active"); // it waits

    for (const slug of ["viveca", "pablo", "gwen"]) {
      w.state.variables[`interview_${slug}_done`] = true;
    }
    const retry = w.dialogues.start("elena_e01");
    expect(retry.choices.map((c) => c.id)).toEqual(["bring_maps"]);
    w.dialogues.choose("bring_maps");
    w.dialogues.choose("close");
    expect(w.quests.getQuestStatus("E01")).toBe("completed");
    expect(w.state.variables.knowledge_table_held).toBe(true);
    expect(w.state.resources.voice).toBe(2);
    expect(w.state.resources.trust).toBe(1);
  });
});
