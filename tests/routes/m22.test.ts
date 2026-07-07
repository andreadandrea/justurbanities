import { describe, expect, it } from "vitest";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { BarrierMap, M22_QUEST_ID, SEED_PIN_ID } from "../../src/game/story/BarrierMap";
import { dialogueFileSchema, districtFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";
import districtsData from "../../src/data/districts.json";

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  const barrierMap = new BarrierMap(state, resolver);
  const events: Array<{ type: string; payload?: Record<string, unknown> }> = [];
  resolver.setProgressEventHandler((type, payload) => events.push({ type, payload }));
  return { state, quests, resolver, dialogues, barrierMap, events };
}

describe("M22 — The Map Is Not the Territory (§4.2)", () => {
  it("ships as a quest and every district carries a documentable pin", () => {
    const quests = validateData("quests.json", questFileSchema, questsData) as QuestFile;
    expect(quests.quests.find((quest) => quest.id === "M22")).toBeDefined();
    const districts = validateData("districts.json", districtFileSchema, districtsData);
    for (const district of districts.districts) {
      expect(district.barriers?.length, `${district.id} has no barrier pin`).toBeGreaterThan(0);
      for (const pin of district.barriers ?? []) {
        const dialogue = (dialoguesData as { dialogues: Array<{ id: string }> }).dialogues.find(
          (candidate) => candidate.id === `barrier_${pin.id}`
        );
        expect(dialogue, `barrier_${pin.id} has no dialogue`).toBeDefined();
      }
    }
  });

  it("Ben's briefing starts the mission; pins are inert before it", () => {
    const w = world();
    expect(w.barrierMap.document("stairwell", "stairs")).toBe(false);
    w.dialogues.start("ben_m22");
    w.dialogues.choose("engage");
    w.dialogues.choose("begin");
    expect(w.quests.getQuestStatus(M22_QUEST_ID)).toBe("active");
    expect(w.barrierMap.active()).toBe(true);
  });

  it("three documented barriers give Voice +1 each and complete the mission", () => {
    const w = world();
    w.dialogues.start("ben_m22");
    w.dialogues.choose("engage");
    w.dialogues.choose("begin");
    const voiceBefore = w.state.resources.voice;

    expect(w.barrierMap.document("stairwell", "stairs")).toBe(true);
    expect(w.barrierMap.document("stairwell", "stairs")).toBe(false); // idempotent
    expect(w.barrierMap.document("underpass", "fear")).toBe(true);
    expect(w.quests.getQuestStatus(M22_QUEST_ID)).toBe("active");
    expect(w.barrierMap.document("office_forms", "language")).toBe(true);

    expect(w.state.resources.voice - voiceBefore).toBe(3);
    expect(w.quests.getQuestStatus(M22_QUEST_ID)).toBe("completed");
    expect(w.events.filter((event) => event.type === "barrier_pin")).toHaveLength(3);
    expect(w.events.some((event) => event.type === "quest_completed")).toBe(true);
    // completed mission deactivates the remaining pins
    expect(w.barrierMap.document("locked_gate", "physical")).toBe(false);
  });

  it("✳ Samir's ch.1 fence photo seeds the first pin without double Voice", () => {
    const w = world();
    w.state.variables.fence_photographed = true; // set in route_samir_barrier (+1 Voice there)
    w.dialogues.start("ben_m22");
    const brief = w.dialogues.choose("engage");
    expect(brief.node?.choices.map((choice) => choice.id)).toContain("first_pin");
    w.dialogues.choose("first_pin");

    w.barrierMap.sync(); // App fires this when the dialogue ends
    expect(w.barrierMap.documented(SEED_PIN_ID)).toBe(true);
    expect(w.barrierMap.pinsDocumented()).toBe(1);
    const voiceBefore = w.state.resources.voice;

    w.barrierMap.document("stairwell", "stairs");
    w.barrierMap.document("underpass", "fear");
    // seed + 2 documented = 3 pins → mission complete, Voice only for the 2 new pins
    expect(w.state.resources.voice - voiceBefore).toBe(2);
    expect(w.quests.getQuestStatus(M22_QUEST_ID)).toBe("completed");
  });

  it("progress survives save/restore (variables carry the overlay)", () => {
    const w = world();
    w.dialogues.start("ben_m22");
    w.dialogues.choose("engage");
    w.dialogues.choose("begin");
    w.barrierMap.document("stairwell", "stairs");

    const restored = new GameState();
    restored.restore(w.state.snapshot());
    const quests = new QuestManager();
    quests.restore(w.quests.snapshot());
    const map = new BarrierMap(restored, new EffectResolver(restored, quests));
    expect(map.documented("stairwell")).toBe(true);
    expect(map.pinsDocumented()).toBe(1);
    expect(map.active()).toBe(true);
  });
});
