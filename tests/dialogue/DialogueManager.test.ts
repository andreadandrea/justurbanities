import { describe, expect, it } from "vitest";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { GameState } from "../../src/game/GameState";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";

function setup() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(questsData as unknown as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(dialoguesData as unknown as DialogueFile);
  return { state, quests, resolver, dialogues };
}

describe("DialogueManager + QuestManager integration (Task 1)", () => {
  it("plays Anna's dialogue from JSON: starts P01 and completes talk_to_anna", () => {
    const { state, quests, dialogues } = setup();

    const start = dialogues.start("anna_intro");
    expect(start.text).toContain("city map");
    expect(quests.getQuestStatus("P01")).toBe("active");

    const result = dialogues.choose("listen");
    expect(result.ended).toBe(false);
    expect(result.node?.text).toContain("different routes");
    expect(state.variables.talkedTo_anna).toBe(true);
    expect(state.resources.voice).toBe(1);

    const closing = dialogues.choose("close");
    expect(closing.ended).toBe(true);
  });

  it("completes P01 after talking to both Anna and Ben", () => {
    const { state, quests, dialogues } = setup();

    dialogues.start("anna_intro");
    dialogues.choose("listen");
    dialogues.choose("close");
    expect(quests.getQuestStatus("P01")).toBe("active");

    dialogues.start("ben_intro");
    dialogues.choose("ask_barrier");
    dialogues.choose("close");

    expect(state.variables.talkedTo_ben).toBe(true);
    expect(state.resources.care).toBe(1);
    expect(state.variables.promised_check_entrance).toBe(true);
    expect(quests.getQuestStatus("P01")).toBe("completed");
  });

  it("applies node entry effects exactly once, even with repeated reads", () => {
    const { state, quests, resolver } = setup();
    const dialogues = new DialogueManager(resolver);
    dialogues.load({
      dialogues: [
        {
          id: "test",
          speakerId: "anna",
          startNode: "start",
          nodes: {
            start: {
              text: "Entry effect bumps trust.",
              effects: [{ type: "addResource", key: "trust", value: 1 }],
              choices: [{ id: "bye", label: "Bye", end: true }]
            }
          }
        }
      ]
    });

    dialogues.start("test");
    dialogues.getCurrentNode();
    dialogues.getCurrentNode();
    const result = dialogues.choose("bye");

    expect(result.ended).toBe(true);
    expect(state.resources.trust).toBe(1);
    expect(quests.getQuestStatus("P01")).toBe("available");
  });

  it("hides choices whose conditions are not met", () => {
    const { state, resolver } = setup();
    const dialogues = new DialogueManager(resolver);
    dialogues.load({
      dialogues: [
        {
          id: "gated",
          speakerId: "ben",
          startNode: "start",
          nodes: {
            start: {
              text: "Gated choice test.",
              choices: [
                {
                  id: "secret",
                  label: "Secret option",
                  conditions: [{ type: "variableEquals", key: "hasKey", value: true }],
                  end: true
                },
                { id: "leave", label: "Leave", end: true }
              ]
            }
          }
        }
      ]
    });

    expect(dialogues.start("gated").choices.map((c) => c.id)).toEqual(["leave"]);

    state.variables.hasKey = true;
    expect(dialogues.start("gated").choices.map((c) => c.id)).toEqual(["secret", "leave"]);
  });
});
