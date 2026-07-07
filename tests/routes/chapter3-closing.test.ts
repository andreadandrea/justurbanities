import { describe, expect, it } from "vitest";
import { GameState } from "../../src/game/GameState";
import { GameClock } from "../../src/game/time/GameClock";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { StoryDirector, CH3_INTERVENTIONS } from "../../src/game/story/StoryDirector";
import { CrisisWeek, CRISIS_WEEK_FLAG, CRISIS_WEEK_START_VAR } from "../../src/game/crisis/CrisisWeek";
import { CrisisManager } from "../../src/game/crisis/CrisisManager";
import { crisisFileSchema, dialogueFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import type { CrisisFile } from "../../src/types/Crisis";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";
import crisesData from "../../src/data/crises.json";
import districtsData from "../../src/data/districts.json";

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
      let node = dialogues.start(dialogueId);
      while (node.choices.length > 0) {
        const result = dialogues.choose(node.choices[0].id);
        if (result.ended || !result.node) break;
        node = result.node;
      }
    },
    () => false,
    (dialogueId) => dialogues.has(dialogueId),
    districtsData.districts.map((district) => district.id),
    (questId) => quests.getQuestStatus(questId)
  );
  return { state, quests, resolver, dialogues, director, runs };
}

function midChapter3(w: ReturnType<typeof world>) {
  w.state.variables.prologue_complete = true;
  w.state.variables.route_complete = true;
  w.state.variables.assembly_v1_seen = true;
  w.state.variables.chapter2_unlocked = true;
  w.state.variables.chapter2_closing_seen = true;
  w.state.variables.chapter3_unlocked = true;
}

describe("chapter 3 closing (§5.9) — the Fragmentation reacts", () => {
  it("stays closed below 3 completed interventions", () => {
    const w = world();
    midChapter3(w);
    w.quests.startQuest("M31");
    w.quests.completeQuest("M31");
    w.quests.startQuest("M32");
    w.quests.completeQuest("M32");
    w.director.check();
    expect(w.runs).toEqual([]);
  });

  it("3 interventions trigger the complication and arm Crisis Week", () => {
    const w = world();
    midChapter3(w);
    for (const questId of ["M31", "M33", "M34"]) {
      w.quests.startQuest(questId);
      w.quests.completeQuest(questId);
    }
    const careBefore = w.state.resources.care;
    w.director.check();
    expect(w.runs).toEqual(["chapter3_closing"]);
    // N10 untouched (locked): Piotr's exit drags others — Care −1 (§5.9)
    expect(w.state.resources.care - careBefore).toBe(-1);
    expect(w.state.variables[CRISIS_WEEK_FLAG]).toBe(true);
    expect(w.state.variables.chapter3_closing_seen).toBe(true);

    // idempotent
    w.director.check();
    expect(w.runs).toEqual(["chapter3_closing"]);
  });

  it("with N10 done the volunteers hold (no Care penalty)", () => {
    const w = world();
    midChapter3(w);
    for (const questId of ["M31", "M33", "N08"]) {
      w.quests.startQuest(questId);
      w.quests.completeQuest(questId);
    }
    w.quests.startQuest("N10");
    w.quests.completeQuest("N10");
    const careBefore = w.state.resources.care;
    w.director.check();
    expect(w.runs).toEqual(["chapter3_closing"]);
    expect(w.state.resources.care).toBe(careBefore);
  });

  it("the armed flag starts Crisis Week on the next morning (content path, not debug)", () => {
    const w = world();
    const clock = new GameClock(w.state);
    const manager = new CrisisManager(w.state, w.resolver, () => {});
    manager.load(validateData("crises.json", crisisFileSchema, crisesData) as CrisisFile);
    new CrisisWeek(w.state, clock, manager, () => {}, () => false);
    w.state.variables[CRISIS_WEEK_FLAG] = true; // what chapter3_closing does
    clock.advance();
    clock.advance();
    clock.advance(); // end of day → next morning
    expect(w.state.variables[CRISIS_WEEK_START_VAR]).toBeDefined();
  });

  it("every ch.3 intervention id exists as a quest", () => {
    const quests = validateData("quests.json", questFileSchema, questsData) as QuestFile;
    const ids = new Set(quests.quests.map((quest) => quest.id));
    for (const questId of CH3_INTERVENTIONS) {
      expect(ids.has(questId), `${questId} missing from quests.json`).toBe(true);
    }
  });
});
