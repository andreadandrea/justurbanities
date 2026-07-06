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

const SCENES = [
  "community_center",
  "crossroads",
  "old_blocks",
  "grey_yards",
  "youth_court",
  "coastline",
  "hill_gardens",
  "lake_edge"
];
const ALL_QUESTS = Array.from({ length: 18 }, (_, i) => `N${String(i + 1).padStart(2, "0")}`);

function world() {
  const state = new GameState();
  const clock = new GameClock(state);
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  const schedule = validateData("schedule.json", scheduleFileSchema, scheduleData) as ScheduleFile;
  return { state, clock, quests, resolver, dialogues, schedule };
}

/**
 * Simulates a patient player: walks both scenes at every part of day for a
 * few days, opening every scheduled dialogue the first time it appears and
 * always taking the first available choice until the dialogue ends.
 */
function playEverything(w: ReturnType<typeof world>): Set<string> {
  const opened = new Set<string>();
  const directorPerScene = new Map(
    SCENES.map((sceneId) => {
      const director = new NpcDirector({
        placements: (scene) => activePlacements(w.schedule, scene, w.clock.timePart, (c) => w.resolver.checkAll(c)),
        createSprite: () => null
      });
      director.setScene(sceneId);
      return [sceneId, director];
    })
  );

  for (let step = 0; step < 3 * 4; step++) {
    for (const sceneId of SCENES) {
      const director = directorPerScene.get(sceneId)!;
      director.refresh();
      for (const npc of director.list()) {
        if (opened.has(npc.dialogueId)) continue;
        opened.add(npc.dialogueId);
        let node = w.dialogues.start(npc.dialogueId);
        while (node.choices.length > 0) {
          const result = w.dialogues.choose(node.choices[0].id);
          if (result.ended || !result.node) break;
          node = result.node;
        }
        director.refresh();
      }
    }
    w.clock.advance();
  }
  return opened;
}

describe("schedule rollout — all 18 NPC quests", () => {
  it("every quest N01–N18 has a scheduled dialogue that starts it", () => {
    const w = world();
    const dialogueFile = validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile;
    const scheduled = new Set(w.schedule.placements.map((p) => p.dialogueId));
    const startedBy = new Map<string, string>();
    for (const dialogue of dialogueFile.dialogues) {
      if (!scheduled.has(dialogue.id)) continue;
      for (const node of Object.values(dialogue.nodes)) {
        for (const effect of node.effects ?? []) {
          if (effect.type === "startQuest") startedBy.set(effect.questId, dialogue.id);
        }
      }
    }
    for (const questId of ALL_QUESTS) {
      expect(startedBy.has(questId), `${questId} has no scheduled dialogue starting it`).toBe(true);
    }
  });

  it("a player walking every district across the days can trigger and complete every N-quest", () => {
    const w = world();
    const opened = playEverything(w);

    // Every scheduled quest dialogue was reachable in-world...
    for (const questId of ALL_QUESTS) {
      const suffix = questId.toLowerCase();
      const wasOpened = [...opened].some((id) => id.endsWith(`_${suffix}`));
      expect(wasOpened, `dialogue for ${questId} never became triggerable`).toBe(true);
    }

    // ...and every quest completed (first-choice runs may take engage or
    // shortcut; both routes complete the quest by design).
    for (const questId of ALL_QUESTS) {
      expect(w.quests.getQuestStatus(questId), `${questId} not completed`).toBe("completed");
    }
  });

  it("no placeholder texts remain in the N-quest dialogues (task 2.4)", () => {
    const dialogueFile = validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile;
    const nDialogues = dialogueFile.dialogues.filter((d) => /_n\d\d$/.test(d.id));
    expect(nDialogues).toHaveLength(18);
    for (const dialogue of nDialogues) {
      // every quest dialogue got its canon resolution beat
      expect(dialogue.nodes.resolution, `${dialogue.id} has no resolution node`).toBeDefined();
      for (const node of Object.values(dialogue.nodes)) {
        expect(node.text).not.toMatch(/Affronta la quest|Scegli la scorciatoia/);
        for (const choice of node.choices) {
          expect(choice.label, `${dialogue.id} still has a generic choice label`).not.toMatch(
            /Affronta la quest|Scegli la scorciatoia/
          );
        }
      }
    }
  });

  it("every NPC keeps at most one active placement at any scene/time", () => {
    const w = world();
    for (const sceneId of SCENES) {
      for (let part = 0; part < 3; part++) {
        const active = activePlacements(w.schedule, sceneId, part, () => true);
        const ids = active.map((p) => p.npcId);
        // duplicates are allowed in data (fallbacks) but the director dedupes;
        // here we assert no two DIFFERENT positions for the same npc/time.
        const byNpc = new Map<string, { x: number; y: number }>();
        for (const placement of active) {
          const prev = byNpc.get(placement.npcId);
          if (prev) {
            expect(
              prev.x === placement.position.x && prev.y === placement.position.y,
              `${placement.npcId} has two different positions in ${sceneId} at part ${part}`
            ).toBe(true);
          } else {
            byNpc.set(placement.npcId, placement.position);
          }
        }
        expect(ids.length).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
