import { describe, expect, it } from "vitest";
import { NpcDirector } from "../../src/game/npc/NpcDirector";
import { activePlacements } from "../../src/game/npc/NpcSchedule";
import { GameState } from "../../src/game/GameState";
import { GameClock } from "../../src/game/time/GameClock";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { dialogueFileSchema, questFileSchema, scheduleFileSchema, validateData } from "../../src/data/validation";
import type { ScheduleFile } from "../../src/types/Schedule";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import scheduleData from "../../src/data/schedule.json";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";

/** Full engine wiring on the real data files — no scenes, no DOM. */
function world() {
  const state = new GameState();
  const clock = new GameClock(state);
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  const schedule = validateData("schedule.json", scheduleFileSchema, scheduleData) as ScheduleFile;

  const director = new NpcDirector<{ id: string }>({
    placements: (sceneId) => activePlacements(schedule, sceneId, clock.timePart, (c) => resolver.checkAll(c)),
    createSprite: (npcId) => ({ id: npcId })
  });
  director.setScene("community_center");

  return { state, clock, quests, resolver, dialogues, director };
}

function npcId(director: ReturnType<typeof world>["director"], dialogueId: string) {
  return director.list().find((entry) => entry.dialogueId === dialogueId);
}

function npc(director: ReturnType<typeof world>["director"], id: string) {
  const found = director.list().find((entry) => entry.id === id);
  if (!found) throw new Error(`NPC ${id} not on stage`);
  return found;
}

/** Play the whole §2 prologue so chapter-2 offers (N01/N02) unlock. */
function completePrologue(w: ReturnType<typeof world>): void {
  w.dialogues.start("anna_intro");
  w.dialogues.choose("alive");
  w.dialogues.choose("close");
  w.dialogues.start("ben_intro");
  w.dialogues.choose("assembly_mind");
  w.dialogues.start("anna_map_glitch");
  w.dialogues.choose("headline");
  w.dialogues.choose("accept");
  w.director.refresh();
}

describe("NpcDirector — N01 (Anna) end-to-end in-world", () => {
  it("intro -> prologue -> quest offer -> completion -> fallback, with persistent quest state", () => {
    const w = world();
    const { quests, dialogues, director } = w;

    // Fresh game: Anna offers her prologue opening, not the quest.
    expect(npc(director, "anna").dialogueId).toBe("anna_intro");

    completePrologue(w);

    // talkedTo_anna is set, prologue complete, N01 still locked -> quest offer wins.
    expect(npc(director, "anna").dialogueId).toBe("anna_n01");

    // Play N01: engage starts Mission 1 — a week of questions, not answers.
    dialogues.start("anna_n01");
    expect(quests.getQuestStatus("N01")).toBe("active");
    dialogues.choose("engage");
    expect(quests.getQuestStatus("N01")).toBe("active"); // interviews pending

    // Three interviews in three districts build the empathy maps.
    for (const [scene, dialogueId] of [
      ["lake_edge", "interview_viveca"],
      ["old_blocks", "interview_pablo"],
      ["hill_gardens", "interview_gwen"]
    ] as const) {
      director.setScene(scene);
      expect(npcId(director, dialogueId), `${dialogueId} not offered in ${scene}`).toBeDefined();
      dialogues.start(dialogueId);
      dialogues.choose("ask");
    }

    // Anna's resolution closes the mission.
    director.setScene("community_center");
    expect(npc(director, "anna").dialogueId).toBe("anna_n01_resolution");
    dialogues.start("anna_n01_resolution");
    dialogues.choose("close");
    expect(quests.getQuestStatus("N01")).toBe("completed");
    director.refresh();

    // Quest done -> Anna falls back to her intro placement.
    expect(npc(director, "anna").dialogueId).toBe("anna_intro");

    // Quest state persists through snapshot/restore (what autosave stores).
    const restored = new QuestManager();
    restored.restore(quests.snapshot());
    expect(restored.getQuestStatus("N01")).toBe("completed");
  });

  it("N01 shortcut route raises fragmentation instead of weaving resources", () => {
    const { state, dialogues, quests } = world();
    const before = state.resources.fragmentationGlobal;
    dialogues.start("anna_n01");
    dialogues.choose("shortcut");
    expect(quests.getQuestStatus("N01")).toBe("completed");
    expect(state.resources.fragmentationGlobal).toBe(before + 1);
  });
});

describe("NpcDirector — N02 (Ben) end-to-end in-world", () => {
  it("intro -> quest offer -> completion -> fallback", () => {
    const w = world();
    const { state, quests, dialogues, director } = w;

    expect(npc(director, "ben").dialogueId).toBe("ben_intro");

    completePrologue(w);
    // Ben's N02 offer lives at the Crossing itself (canonical district, 6.3).
    director.setScene("crossroads");
    expect(npc(director, "ben").dialogueId).toBe("ben_n02");

    dialogues.start("ben_n02");
    dialogues.choose("engage");
    expect(quests.getQuestStatus("N02")).toBe("completed");
    expect(state.resources.care).toBeGreaterThan(0);
    director.setScene("community_center");
    expect(npc(director, "ben").dialogueId).toBe("ben_intro");
  });
});

describe("NpcDirector mechanics", () => {
  it("reuses sprite instances across refreshes for NPCs that stay", () => {
    const { director } = world();
    const first = npc(director, "anna").sprite;
    director.refresh();
    expect(npc(director, "anna").sprite).toBe(first);
  });

  it("NPCs appear and leave when time passes (timeParts)", () => {
    const state = new GameState();
    const clock = new GameClock(state);
    const schedule: ScheduleFile = {
      placements: [
        {
          npcId: "gwen",
          scene: "crossroads",
          position: { x: 1, y: 1 },
          dialogueId: "gwen_n09",
          timeParts: [0]
        }
      ]
    };
    const director = new NpcDirector({
      placements: (sceneId) => activePlacements(schedule, sceneId, clock.timePart, () => true),
      createSprite: () => null
    });
    clock.on(() => director.refresh());
    director.setScene("crossroads");

    expect(director.list().map((n) => n.id)).toEqual(["gwen"]);
    clock.advance(); // morning -> afternoon: Gwen's shift is over
    expect(director.list()).toHaveLength(0);
    clock.advance(2); // -> next morning: she is back
    expect(director.list().map((n) => n.id)).toEqual(["gwen"]);
  });
});
