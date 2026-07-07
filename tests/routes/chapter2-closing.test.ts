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
import districtsData from "../../src/data/districts.json";

const DISTRICT_IDS = districtsData.districts.map((district) => district.id);

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  const runs: string[] = [];
  const director = new StoryDirector(
    state,
    (dialogueId) => {
      runs.push(dialogueId);
      // run the dialogue to the end like the app's runner would
      let node = dialogues.start(dialogueId);
      while (node.choices.length > 0) {
        const result = dialogues.choose(node.choices[0].id);
        if (result.ended || !result.node) break;
        node = result.node;
      }
    },
    () => false,
    (dialogueId) => dialogues.has(dialogueId),
    DISTRICT_IDS
  );
  return { state, quests, resolver, dialogues, director, runs };
}

/** Put the save in a plausible mid-chapter-2 state. */
function midChapter2(w: ReturnType<typeof world>) {
  w.state.variables.prologue_complete = true;
  w.state.variables.route_complete = true;
  w.state.variables.assembly_v1_seen = true;
  w.state.variables.chapter2_unlocked = true;
}

describe("chapter 2 closing (§4.6) — gate and ensemble scene", () => {
  it("does not fire before 3 districts + Mission 1", () => {
    const w = world();
    midChapter2(w);
    w.director.check();
    expect(w.runs).toEqual([]);

    // two districts + M1 done: still not enough
    w.state.variables.listenBeforeFixingDone = true;
    w.state.variables.old_blocksIntroSeen = true;
    w.state.variables.lake_edgeIntroSeen = true;
    w.director.check();
    expect(w.runs).toEqual([]);

    // three districts but M1 missing: still closed
    w.state.variables.listenBeforeFixingDone = undefined as never;
    delete w.state.variables.listenBeforeFixingDone;
    w.state.variables.hill_gardensIntroSeen = true;
    w.director.check();
    expect(w.runs).toEqual([]);
  });

  it("fires once when 3 districts are visited and M1 is done, and opens ch.3", () => {
    const w = world();
    midChapter2(w);
    w.state.variables.listenBeforeFixingDone = true;
    for (const id of ["old_blocks", "lake_edge", "hill_gardens"]) {
      w.state.variables[`${id}IntroSeen`] = true;
    }
    w.director.check();
    expect(w.runs).toEqual(["chapter2_closing"]);

    // §4.6 outcomes: chapter 3 opens, Ruben's tease is on record
    expect(w.state.variables.chapter3_unlocked).toBe(true);
    expect(w.state.variables.ruben_curious).toBe(true);
    expect(w.state.variables.chapter2_closing_seen).toBe(true);

    // idempotent: a later check never replays the scene
    w.director.check();
    expect(w.runs).toEqual(["chapter2_closing"]);
  });

  it("keeps the chapter-1 flow untouched for a fresh save", () => {
    const w = world();
    w.state.variables.prologue_complete = true;
    w.state.currentCharacter = "maya";
    w.director.check();
    expect(w.runs).toEqual(["route_maya"]);
  });
});
