import { describe, expect, it } from "vitest";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { StoryDirector } from "../../src/game/story/StoryDirector";
import { dialogueFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";

function world(character = "maya") {
  const state = new GameState();
  state.startNewGame(character, character, "they");
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);

  const shown: string[] = [];
  let open = false;
  const director = new StoryDirector(
    state,
    (dialogueId) => {
      shown.push(dialogueId);
      open = true;
    },
    () => open,
    (dialogueId) => dialogues.has(dialogueId)
  );
  return { state, quests, dialogues, director, shown, close: () => (open = false) };
}

/** Play a dialogue picking the given choice ids in order. */
function play(w: ReturnType<typeof world>, dialogueId: string, ...choiceIds: string[]) {
  w.dialogues.start(dialogueId);
  for (const choiceId of choiceIds) w.dialogues.choose(choiceId);
  w.close();
  w.director.check();
}

describe("Chapter 1 routes (§3)", () => {
  it("the story director launches the current character's route after the prologue", () => {
    const w = world("maya");
    w.director.check();
    expect(w.shown).toEqual([]); // prologue not done yet
    w.state.variables.prologue_complete = true;
    w.close();
    w.director.check();
    expect(w.shown).toEqual(["route_maya"]);
  });

  it("Maya's route: care network path and arriving with Zoe", () => {
    const w = world("maya");
    w.state.variables.prologue_complete = true;
    w.director.check();
    play(w, "route_maya", "refuse", "call_farah", "farah_again", "walk_in");
    expect(w.state.variables).toMatchObject({
      boss_annoyed: true,
      farah_asked: true,
      care_net_started: true,
      maya_arrived_with_zoe: true,
      route_complete: true
    });
    expect(w.state.resources.care).toBe(2);
    expect(w.state.resources.trust).toBe(1);
    // the assembly follows
    expect(w.shown).toContain("assembly_v1");
  });

  it("Maya's care-net option is gated on having asked Farah first", () => {
    const w = world("maya");
    w.dialogues.start("route_maya");
    w.dialogues.choose("refuse");
    w.dialogues.choose("wait"); // no Farah
    const node = w.dialogues.getCurrentNode();
    expect(node.choices.map((c) => c.id)).not.toContain("farah_again");
  });

  it("Samir's route pauses at the fence: the world resumes it, not the director", () => {
    const w = world("samir");
    w.state.variables.prologue_complete = true;
    w.director.check();
    expect(w.shown).toEqual(["route_samir"]);
    play(w, "route_samir", "ask_abdullah", "ride");
    // stage=barrier: the director must NOT restart anything
    expect(w.state.variables.samir_route_stage).toBe("barrier");
    expect(w.shown).toEqual(["route_samir"]);

    // The fence collision (CrossroadsScene) opens the barrier dialogue.
    w.dialogues.start("route_samir_barrier");
    w.dialogues.choose("kids_gap");
    // with abdullah_bridge, the vouched checkpoint choice is available
    const checkpoint = w.dialogues.getCurrentNode();
    expect(checkpoint.choices.map((c) => c.id)).toContain("show_invitation");
    w.dialogues.choose("show_invitation");
    w.dialogues.choose("name_barriers");
    w.close();
    w.director.check();

    expect(w.state.variables).toMatchObject({
      abdullah_bridge: true,
      crossing_blocked: true,
      samir_spoke: true,
      route_complete: true
    });
    expect(w.state.resources.voice).toBe(2);
    expect(w.shown).toContain("assembly_v1");
  });

  it("Samir's name-the-barriers dilemma is gated on crossing_blocked or abdullah_bridge", () => {
    const w = world("samir");
    w.dialogues.start("route_samir_barrier");
    w.dialogues.choose("detour"); // neither flag from the fence
    w.dialogues.choose("ask_everyone");
    const dilemma = w.dialogues.getCurrentNode();
    expect(dilemma.choices.map((c) => c.id)).not.toContain("name_barriers");
  });

  it("Elena's route: commission + site visit set the ch.3/N08 seeds", () => {
    const w = world("elena");
    w.state.variables.prologue_complete = true;
    w.director.check();
    play(w, "route_elena", "commission", "show_me", "verifiable_dates", "state_limits");
    expect(w.state.variables).toMatchObject({
      commission_started: true, // the N08 engage gate
      elena_saw_it: true,
      elena_dates_promised: true,
      elena_stated_limits: true,
      route_complete: true
    });
  });

  it("Elena skipping the site visit talks like a PDF at the dilemma", () => {
    const w = world("elena");
    w.dialogues.start("route_elena");
    w.dialogues.choose("cautious");
    w.dialogues.choose("skip");
    w.dialogues.choose("no_statement");
    const dilemma = w.dialogues.getCurrentNode();
    const ids = dilemma.choices.map((c) => c.id);
    expect(ids).toContain("technical");
    expect(ids).not.toContain("technical_saved");
  });

  it("Luca's route: corporate contact opens N18 earlier; the investor meeting is remembered", () => {
    const w = world("luca");
    w.state.variables.prologue_complete = true;
    w.director.check();
    play(w, "route_luca", "stay_open", "info_only", "just_words", "investor_meeting");
    expect(w.state.variables).toMatchObject({
      corporate_contact: true,
      corporate_meeting: true,
      route_complete: true
    });
  });

  it("the custom route positions the player and completes in one scene", () => {
    const w = world("custom");
    w.state.variables.prologue_complete = true;
    w.director.check();
    play(w, "route_custom", "observe");
    expect(w.state.variables.custom_position).toBe("observer");
    expect(w.state.variables.route_complete).toBe(true);
  });
});

describe("First assembly (§3.6) — outcomes shape the scene", () => {
  function reach(w: ReturnType<typeof world>) {
    w.dialogues.start("assembly_v1");
    return w.dialogues.getCurrentNode();
  }

  it("Elena's beat depends on the site visit", () => {
    const w = world("elena");
    w.state.variables.elena_saw_it = true;
    reach(w);
    w.dialogues.choose("look");
    const ben = w.dialogues.getCurrentNode();
    expect(ben.choices.map((c) => c.id)).toEqual(["elena_concrete"]);
  });

  it("without the visit, the slides node plays instead", () => {
    const w = world("elena");
    reach(w);
    w.dialogues.choose("look");
    const ben = w.dialogues.getCurrentNode();
    expect(ben.choices.map((c) => c.id)).toEqual(["elena_pdf"]);
  });

  it("Maya's and Samir's voices only sound if their routes earned them", () => {
    const w = world("maya");
    w.state.variables.maya_arrived_with_zoe = true;
    reach(w);
    w.dialogues.choose("look");
    w.dialogues.choose("elena_pdf");
    w.dialogues.choose("next");
    const voices = w.dialogues.getCurrentNode();
    const ids = voices.choices.map((c) => c.id);
    expect(ids).toContain("maya_line");
    expect(ids).not.toContain("samir_line");
  });

  it("closing the assembly completes P02 and unlocks chapter 2", () => {
    const w = world("maya");
    w.quests.startQuest("P02");
    reach(w);
    w.dialogues.choose("look");
    w.dialogues.choose("elena_pdf");
    w.dialogues.choose("next");
    w.dialogues.choose("silence");
    w.dialogues.choose("map_cracks");
    expect(w.state.variables.assembly_v1_seen).toBe(true);
    expect(w.state.variables.chapter2_unlocked).toBe(true);
    expect(w.quests.getQuestStatus("P02")).toBe("completed");
  });
});
