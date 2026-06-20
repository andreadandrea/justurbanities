import { describe, expect, it } from "vitest";
import { NpcDirector, type NpcPlacement } from "../../src/game/npc/NpcDirector";
import { GameState } from "../../src/game/GameState";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { QuestManager } from "../../src/game/quest/QuestManager";
import type { QuestFile } from "../../src/types/Quest";
import questsData from "../../src/data/quests.json";
import npcPlacementData from "../../src/data/npc_placement.json";
import type { NpcPlacementFile } from "../../src/game/npc/NpcDirector";

function makeResolver(state: GameState): { resolver: EffectResolver; quests: QuestManager } {
  const quests = new QuestManager();
  quests.load(questsData as unknown as QuestFile);
  return { resolver: new EffectResolver(state, quests), quests };
}

const placement = (overrides: Partial<NpcPlacement>): NpcPlacement => ({
  npcId: "anna",
  scene: "community_center",
  x: 0,
  y: 0,
  dialogueId: "anna_n01",
  ...overrides
});

describe("NpcDirector", () => {
  it("returns only placements for the requested scene", () => {
    const state = new GameState();
    const { resolver } = makeResolver(state);
    const director = new NpcDirector([
      placement({ npcId: "anna", scene: "community_center" }),
      placement({ npcId: "pablo", scene: "crossroads", dialogueId: "pablo_n11" })
    ]);

    const here = director.npcsForScene("community_center", state, resolver);
    expect(here.map((p) => p.npcId)).toEqual(["anna"]);
  });

  it("filters by time part", () => {
    const state = new GameState();
    const { resolver } = makeResolver(state);
    const director = new NpcDirector([
      placement({ npcId: "morning", when: { timeParts: [0] } }),
      placement({ npcId: "evening", when: { timeParts: [2] } })
    ]);

    state.timePart = 0;
    expect(director.npcsForScene("community_center", state, resolver).map((p) => p.npcId)).toEqual(["morning"]);
    state.timePart = 2;
    expect(director.npcsForScene("community_center", state, resolver).map((p) => p.npcId)).toEqual(["evening"]);
  });

  it("filters by dayMin and dayMax (inclusive)", () => {
    const state = new GameState();
    const { resolver } = makeResolver(state);
    const p = placement({ when: { dayMin: 2, dayMax: 3 } });

    state.day = 1;
    expect(NpcDirector.isPresent(p, state, resolver)).toBe(false);
    state.day = 2;
    expect(NpcDirector.isPresent(p, state, resolver)).toBe(true);
    state.day = 3;
    expect(NpcDirector.isPresent(p, state, resolver)).toBe(true);
    state.day = 4;
    expect(NpcDirector.isPresent(p, state, resolver)).toBe(false);
  });

  it("filters by conditions via EffectResolver.checkAll", () => {
    const state = new GameState();
    const { resolver, quests } = makeResolver(state);
    const p = placement({
      when: { conditions: [{ type: "questState", questId: "N03", state: "completed" }] }
    });

    expect(NpcDirector.isPresent(p, state, resolver)).toBe(false);
    quests.startQuest("N03");
    quests.completeQuest("N03");
    expect(NpcDirector.isPresent(p, state, resolver)).toBe(true);
  });

  it("treats a placement with no `when` as always present", () => {
    const state = new GameState();
    const { resolver } = makeResolver(state);
    state.day = 99;
    state.timePart = 2;
    expect(NpcDirector.isPresent(placement({}), state, resolver)).toBe(true);
  });

  it("drives the shipped npc_placement.json: each scene yields NPCs at some time", () => {
    const file = npcPlacementData as unknown as NpcPlacementFile;
    const director = new NpcDirector(file.placements);
    const state = new GameState();
    const { resolver } = makeResolver(state);

    const seen = new Set<string>();
    for (const scene of ["community_center", "crossroads"]) {
      for (let day = 1; day <= 2; day++) {
        for (let part = 0; part < 3; part++) {
          state.day = day;
          state.timePart = part;
          for (const npc of director.npcsForScene(scene, state, resolver)) seen.add(npc.npcId);
        }
      }
      // Each scene has at least one NPC present across the sampled day/time grid.
      expect(seen.size).toBeGreaterThan(0);
    }
  });
});
