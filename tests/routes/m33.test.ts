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

describe("M33 — The Invitation Problem (§5.3)", () => {
  it("composes the invitation across tone, languages and channels", () => {
    const w = world();
    w.dialogues.start("samir_m33");
    w.dialogues.choose("engage");
    expect(w.quests.getQuestStatus("M33")).toBe("active");
    w.dialogues.choose("warm");
    w.dialogues.choose("multi");
    w.dialogues.choose("street");
    w.dialogues.choose("close");

    expect(w.quests.getQuestStatus("M33")).toBe("completed");
    expect(w.state.variables).toMatchObject({
      m33_tone: "warm",
      m33_languages: "multi",
      m33_channels: "street",
      invitation_ready: true
    });
  });

  it("✳ Samir signs the new version only when invito_da_correggere is set (Voice +1)", () => {
    const w = world();
    w.dialogues.start("samir_m33");
    w.dialogues.choose("engage");
    w.dialogues.choose("warm");
    w.dialogues.choose("multi");
    const done = w.dialogues.choose("street");
    // without the ch.1 flag the sign choice is hidden
    expect(done.node?.choices.map((choice) => choice.id)).toEqual(["close"]);

    const w2 = world();
    w2.state.variables.invito_da_correggere = true;
    w2.dialogues.start("samir_m33");
    w2.dialogues.choose("engage");
    w2.dialogues.choose("institutional");
    w2.dialogues.choose("one");
    const done2 = w2.dialogues.choose("official");
    expect(done2.node?.choices.map((choice) => choice.id)).toEqual(["sign", "close"]);
    const voiceBefore = w2.state.resources.voice;
    w2.dialogues.choose("sign");
    expect(w2.state.resources.voice - voiceBefore).toBe(1);
    expect(w2.state.variables.invitation_signed_by_samir).toBe(true);
    expect(w2.quests.getQuestStatus("M33")).toBe("completed");
  });
});
