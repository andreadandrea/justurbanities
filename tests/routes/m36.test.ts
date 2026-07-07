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

describe("M36 — Local Economy, Common Good (§5.6)", () => {
  it("accepting the limit extends the shop net (Commons +1)", () => {
    const w = world();
    const commonsBefore = w.state.resources.commons;
    w.dialogues.start("luca_m36");
    w.dialogues.choose("accept_limit");
    w.dialogues.choose("close");
    expect(w.quests.getQuestStatus("M36")).toBe("completed");
    expect(w.state.variables.shop_net_extended).toBe(true);
    expect(w.state.resources.commons - commonsBefore).toBe(1);
  });

  it("asking for more makes Luca pull back — no Commons, flag recorded", () => {
    const w = world();
    const commonsBefore = w.state.resources.commons;
    w.dialogues.start("luca_m36");
    w.dialogues.choose("ask_more");
    w.dialogues.choose("close");
    expect(w.quests.getQuestStatus("M36")).toBe("completed");
    expect(w.state.variables.luca_pulled_back).toBe(true);
    expect(w.state.variables.shop_net_extended).toBeUndefined();
    expect(w.state.resources.commons).toBe(commonsBefore);
  });
});
