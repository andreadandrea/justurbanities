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
  it("plays Anna's prologue opening (§2.1): starts P01 and completes talk_to_anna", () => {
    const { state, quests, dialogues } = setup();

    const start = dialogues.start("anna_intro");
    expect(start.text).toBe("content.dialogues.anna_intro.start.text");
    expect(quests.getQuestStatus("P01")).toBe("active");

    // "Why is the big hall empty?" — Anna appreciates people who notice.
    const result = dialogues.choose("empty_hall");
    expect(result.ended).toBe(false);
    expect(result.node?.text).toBe("content.dialogues.anna_intro.assembly.text");
    expect(state.variables.talkedTo_anna).toBe(true);
    expect(state.resources.voice).toBe(1);

    const closing = dialogues.choose("close");
    expect(closing.ended).toBe(true);
  });

  it("the noticeboard detour unlocks the attendance detail", () => {
    const { state, dialogues } = setup();
    dialogues.start("anna_intro");
    dialogues.choose("noticeboard");
    expect(state.variables.noticed_attendance).toBe(true);
    dialogues.choose("back");
    dialogues.choose("close");
    expect(state.variables.talkedTo_anna).toBe(true);
  });

  it("completes P01 after talking to both Anna and Ben (§2.2)", () => {
    const { state, quests, dialogues } = setup();

    dialogues.start("anna_intro");
    dialogues.choose("alive");
    dialogues.choose("close");
    expect(quests.getQuestStatus("P01")).toBe("active");

    dialogues.start("ben_intro");
    const result = dialogues.choose("show_where");
    expect(result.ended).toBe(false);
    dialogues.choose("close");

    expect(state.variables.talkedTo_ben).toBe(true);
    expect(state.resources.care).toBe(1);
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

describe("Crossroads dialogues (Task 6)", () => {
  it("intro starts C01 and sets the one-time gate variable", () => {
    const { state, quests, dialogues } = setup();
    expect(quests.getQuestStatus("C01")).toBe("locked");

    dialogues.start("crossroads_intro");
    expect(quests.getQuestStatus("C01")).toBe("active");
    expect(state.variables.crossroadsIntroSeen).toBe(true);

    expect(dialogues.choose("look").ended).toBe(true);
  });

  it("reaching the bus hub completes C01 (arriving is already participation)", () => {
    const { state, quests, dialogues } = setup();
    dialogues.start("crossroads_intro");
    dialogues.choose("look");

    dialogues.start("crossroads_bus_hub");
    expect(quests.getQuestStatus("C01")).toBe("completed");

    const result = dialogues.choose("note_gap");
    expect(result.ended).toBe(false);
    expect(state.variables.notedEveningBusGap).toBe(true);
    expect(state.resources.voice).toBe(1);
    expect(dialogues.choose("close").ended).toBe(true);
  });

  it("every crossroads POI dialogue exists and ends cleanly", () => {
    const { dialogues } = setup();
    for (const [id, choice] of [
      ["crossroads_market", "chat"],
      ["crossroads_narrow_crossing", "measure"],
      ["crossroads_info_point", "read"]
    ] as const) {
      dialogues.start(id);
      expect(dialogues.choose(choice).ended).toBe(true);
    }
  });
});
