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

function world() {
  const state = new GameState();
  const clock = new GameClock(state);
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  const schedule = validateData("schedule.json", scheduleFileSchema, scheduleData) as ScheduleFile;
  const director = new NpcDirector({
    placements: (sceneId) => activePlacements(schedule, sceneId, clock.timePart, (c) => resolver.checkAll(c)),
    createSprite: () => null
  });
  director.setScene("community_center");
  return { state, clock, quests, resolver, dialogues, director };
}

const onStage = (w: ReturnType<typeof world>, id: string) => w.director.list().find((n) => n.id === id);

describe("Prologue v2 (§2) — The Center Holds?", () => {
  it("plays end-to-end: opening, voices round, map glitch, invitation", () => {
    const w = world();

    // 2.1 — Only Anna and Ben are around before the opening conversation.
    expect(onStage(w, "giorgia")).toBeUndefined();
    expect(onStage(w, "elena")).toBeUndefined();

    w.dialogues.start("anna_intro");
    w.dialogues.choose("noticeboard");
    w.dialogues.choose("back");
    w.dialogues.choose("close");
    w.director.refresh();

    // 2.2 — The voices arrive: each plants a seed of a future chapter.
    for (const id of ["giorgia", "ruben", "sigrid", "amin", "elena"]) {
      expect(onStage(w, id), `${id} should be on stage during the voices round`).toBeDefined();
    }

    w.dialogues.start("ben_intro");
    w.dialogues.choose("assembly_mind"); // flag ben_seed
    w.dialogues.start("giorgia_prologue");
    w.dialogues.choose("close");
    w.dialogues.start("ruben_prologue");
    w.dialogues.choose("other_story"); // flag ruben_curious (the N06 gate)
    w.dialogues.start("sigrid_prologue");
    w.dialogues.choose("close");
    w.dialogues.start("amin_prologue");
    w.dialogues.choose("close");
    w.dialogues.start("elena_prologue");
    w.dialogues.choose("clear_limit"); // flag elena_respect
    w.director.refresh();

    // P01 done -> Anna now hosts the map-glitch scene.
    expect(w.quests.getQuestStatus("P01")).toBe("completed");
    expect(onStage(w, "anna")?.dialogueId).toBe("anna_map_glitch");

    // 2.3 + 2.4 — glitch, logbook first entry, the invitation.
    w.dialogues.start("anna_map_glitch");
    w.dialogues.choose("headline");
    w.dialogues.choose("accept");
    w.director.refresh();

    // End-of-prologue effects: seed flags persisted, P02 started.
    expect(w.state.variables).toMatchObject({
      talkedTo_anna: true,
      talkedTo_ben: true,
      noticed_attendance: true,
      ben_seed: true,
      ruben_curious: true,
      giorgia_seed: true,
      sigrid_seed: true,
      amin_seed: true,
      elena_respect: true,
      mapGlitchSeen: true,
      prologue_complete: true,
      assembly_invited: true
    });
    expect(w.quests.getQuestStatus("P02")).toBe("active");

    // The voices leave the prologue staging; chapter placements take over.
    expect(onStage(w, "elena")).toBeUndefined();
    expect(onStage(w, "anna")?.dialogueId).toBe("anna_n01");

    // "The prologue sows, it does not build": no resource above +2.
    for (const [key, value] of Object.entries(w.state.resources)) {
      if (key === "fragmentationGlobal") continue;
      expect(value, `${key} too high for the prologue`).toBeLessThanOrEqual(2);
    }
  });

  it("ruben_curious opens Ruben's engage route in N06 (the ch.4 payoff)", () => {
    const w = world();
    w.state.variables.ruben_curious = true;
    const node = w.dialogues.start("ruben_n06");
    expect(node.choices.map((c) => c.id)).toContain("engage");
  });

  it("without the seed, N06 only offers the shortcut", () => {
    const w = world();
    const node = w.dialogues.start("ruben_n06");
    expect(node.choices.map((c) => c.id)).toEqual(["shortcut"]);
  });

  it("prologue flags survive snapshot/restore", () => {
    const w = world();
    w.state.variables.ben_seed = true;
    w.state.variables.prologue_complete = true;
    const restored = new GameState();
    restored.restore(w.state.snapshot());
    expect(restored.variables.ben_seed).toBe(true);
    expect(restored.variables.prologue_complete).toBe(true);
  });
});
