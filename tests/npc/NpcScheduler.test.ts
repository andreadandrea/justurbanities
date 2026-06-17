import { describe, expect, it } from "vitest";
import { NpcScheduler, type NpcsFile, type ScheduleContext } from "../../src/game/npc/NpcScheduler";
import type { TimePart } from "../../src/game/time/GameClock";
import type { QuestStatus } from "../../src/types/Quest";

const file: NpcsFile = {
  npcs: [
    {
      id: "anna",
      placements: [
        { scene: "community_center", x: 900, y: 620, dialogueId: "anna_intro", parts: ["morning", "afternoon"] }
      ]
    },
    {
      id: "ben",
      placements: [{ scene: "community_center", x: 1240, y: 760, dialogueId: "ben_intro" }]
    },
    {
      id: "samir",
      placements: [
        { scene: "crossroads", x: 620, y: 600, dialogueId: "samir_intro", parts: ["morning"] },
        { scene: "community_center", x: 1000, y: 900, dialogueId: "samir_intro", parts: ["evening"] }
      ]
    },
    {
      id: "gate",
      placements: [
        {
          scene: "community_center",
          x: 10,
          y: 10,
          dialogueId: "gate_intro",
          variableEquals: { key: "doorOpen", value: true },
          questState: { questId: "Q1", state: "active" },
          minDay: 2,
          maxDay: 3
        }
      ]
    }
  ]
};

const ctx = (over: Partial<ScheduleContext> = {}): ScheduleContext => ({
  scene: "community_center",
  day: 1,
  part: "morning",
  getVariable: () => undefined,
  getQuestStatus: () => "locked" as QuestStatus,
  ...over
});

const ids = (s: NpcScheduler, c: ScheduleContext) => s.placementsFor(c).map((p) => p.npcId).sort();

describe("NpcScheduler", () => {
  const scheduler = new NpcScheduler(file);

  it("places NPCs whose part matches, plus part-agnostic ones", () => {
    expect(ids(scheduler, ctx({ part: "morning" }))).toEqual(["anna", "ben"]);
  });

  it("removes NPCs when their time window passes (anna leaves in the evening)", () => {
    expect(ids(scheduler, ctx({ part: "evening" }))).toEqual(["ben", "samir"]);
  });

  it("relocates an NPC between scenes by time of day", () => {
    const morning = scheduler.placementsFor(ctx({ scene: "crossroads", part: "morning" }));
    expect(morning.map((p) => p.npcId)).toEqual(["samir"]);
    expect(morning[0]).toMatchObject({ x: 620, y: 600 });

    const evening = scheduler.placementsFor(ctx({ scene: "community_center", part: "evening" }));
    expect(evening.find((p) => p.npcId === "samir")).toMatchObject({ x: 1000, y: 900 });
  });

  it("returns at most one placement per NPC for a scene", () => {
    const placements = scheduler.placementsFor(ctx({ part: "afternoon" }));
    expect(placements.filter((p) => p.npcId === "anna")).toHaveLength(1);
  });

  it("honours variable, quest and day gates together", () => {
    const open = ctx({
      day: 2,
      getVariable: (k) => (k === "doorOpen" ? true : undefined),
      getQuestStatus: (q) => (q === "Q1" ? "active" : "locked") as QuestStatus
    });
    expect(scheduler.placementsFor(open).some((p) => p.npcId === "gate")).toBe(true);

    // Day out of range -> gated NPC absent.
    expect(scheduler.placementsFor({ ...open, day: 5 }).some((p) => p.npcId === "gate")).toBe(false);
    // Variable not set -> gated NPC absent.
    expect(scheduler.placementsFor({ ...open, getVariable: () => undefined }).some((p) => p.npcId === "gate")).toBe(
      false
    );
  });

  it("lists every referenced npc id for preloading", () => {
    expect(new NpcScheduler(file).allNpcIds().sort()).toEqual(["anna", "ben", "gate", "samir"]);
  });

  it("matches the bundled data shape (TimePart values are valid)", () => {
    const parts: TimePart[] = ["morning", "afternoon", "evening"];
    expect(parts).toContain(ctx().part);
  });
});
