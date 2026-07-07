import { describe, expect, it } from "vitest";
import { GameState } from "../../src/game/GameState";
import { GameClock } from "../../src/game/time/GameClock";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { PromiseManager, PROMISE_KEPT_TRUST, PROMISE_BROKEN_TRUST } from "../../src/game/promise/PromiseManager";
import type { PromiseFile } from "../../src/game/promise/PromiseManager";
import { dialogueFileSchema, promiseFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";
import promisesData from "../../src/data/promises.json";

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  const promiseFile = validateData("promises.json", promiseFileSchema, promisesData) as PromiseFile;
  const promises = new PromiseManager(state);
  promises.load(promiseFile);
  return { state, quests, resolver, dialogues, promises, promiseFile };
}

describe("M31 — The First Promise (§5.1 ✳)", () => {
  it("offers the six canon interventions, each mapped to a registry promise", () => {
    const w = world();
    w.dialogues.start("anna_m31");
    const choose = w.dialogues.choose("engage");
    expect(w.quests.getQuestStatus("M31")).toBe("active");
    const options = choose.node?.choices.map((choice) => choice.id);
    expect(options).toEqual([
      "common_room",
      "crossing",
      "young_event",
      "translated_comms",
      "care_network",
      "courtyard"
    ]);
    // every option's promise id exists in promises.json
    const registry = new Set(w.promiseFile.promises.map((promise) => promise.id));
    for (const choice of choose.node?.choices ?? []) {
      const set = choice.effects?.find(
        (effect) => effect.type === "setVariable" && String(effect.key).startsWith("promise")
      );
      expect(set, `${choice.id} sets no promise`).toBeDefined();
      if (set?.type === "setVariable") expect(registry.has(set.key)).toBe(true);
    }
  });

  it("choosing one intervention activates exactly that promise in the logbook", () => {
    const w = world();
    w.dialogues.start("anna_m31");
    w.dialogues.choose("engage");
    w.dialogues.choose("courtyard");
    w.dialogues.choose("close");

    expect(w.quests.getQuestStatus("M31")).toBe("completed");
    expect(w.state.variables.m31_choice).toBe("courtyard");
    w.promises.evaluate();
    const active = w.promises.list();
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ id: "promiseRepairDay", owner: "sigrid", status: "active" });
  });

  it("the promise scores through the existing PromiseManager (kept and broken)", () => {
    const w = world();
    const clock = new GameClock(w.state);
    w.dialogues.start("anna_m31");
    w.dialogues.choose("engage");
    w.dialogues.choose("crossing");
    w.dialogues.choose("close");
    w.promises.evaluate();

    // kept before the deadline → Trust +3
    const trustBefore = w.state.resources.trust;
    w.state.variables.promiseSaferCrossing = "kept";
    w.promises.evaluate();
    expect(w.state.resources.trust - trustBefore).toBe(PROMISE_KEPT_TRUST);

    // a second run: broken past the deadline → Trust −2, frag +1
    const w2 = world();
    const clock2 = new GameClock(w2.state);
    w2.dialogues.start("anna_m31");
    w2.dialogues.choose("engage");
    w2.dialogues.choose("care_network");
    w2.dialogues.choose("close");
    w2.promises.evaluate();
    const trust2 = w2.state.resources.trust;
    const frag2 = w2.state.resources.fragmentationGlobal;
    for (let i = 0; i < 20; i++) {
      clock2.advance();
      clock2.advance();
      clock2.advance();
    }
    w2.promises.evaluate();
    expect(w2.state.variables.promiseSupportLonelyElders).toBe("broken");
    expect(w2.state.resources.trust - trust2).toBe(PROMISE_BROKEN_TRUST);
    expect(w2.state.resources.fragmentationGlobal - frag2).toBe(1);
    void clock;
  });
});
