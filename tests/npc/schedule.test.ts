import { describe, expect, it } from "vitest";
import {
  charactersSchema,
  dialogueFileSchema,
  scheduleFileSchema,
  validateData
} from "../../src/data/validation";
import { activePlacements } from "../../src/game/npc/NpcSchedule";
import type { ScheduleFile } from "../../src/types/Schedule";
import scheduleData from "../../src/data/schedule.json";
import charactersData from "../../src/data/characters.json";
import dialoguesData from "../../src/data/dialogues.json";

describe("schedule.json", () => {
  it("validates against the schema", () => {
    expect(() => validateData("schedule.json", scheduleFileSchema, scheduleData)).not.toThrow();
  });

  it("Anna and Ben are scheduled in the community center (migrated from hardcoded)", () => {
    const file = validateData("schedule.json", scheduleFileSchema, scheduleData) as ScheduleFile;
    const hub = file.placements.filter((p) => p.scene === "community_center");
    expect(hub.map((p) => p.npcId)).toEqual(expect.arrayContaining(["anna", "ben"]));
  });

  it("every npcId exists in characters.json and every dialogueId in dialogues.json", () => {
    const file = validateData("schedule.json", scheduleFileSchema, scheduleData) as ScheduleFile;
    const characterIds = new Set(validateData("characters.json", charactersSchema, charactersData).map((c) => c.id));
    const dialogueIds = new Set(
      validateData("dialogues.json", dialogueFileSchema, dialoguesData).dialogues.map((d) => d.id)
    );
    for (const placement of file.placements) {
      expect(characterIds.has(placement.npcId), `unknown npcId "${placement.npcId}"`).toBe(true);
      expect(dialogueIds.has(placement.dialogueId), `unknown dialogueId "${placement.dialogueId}"`).toBe(true);
    }
  });

  it("rejects out-of-range timeParts", () => {
    const broken = {
      placements: [
        { npcId: "anna", scene: "community_center", position: { x: 0, y: 0 }, dialogueId: "anna_intro", timeParts: [3] }
      ]
    };
    expect(() => validateData("schedule.json", scheduleFileSchema, broken)).toThrow();
  });
});

describe("activePlacements", () => {
  const file: ScheduleFile = {
    placements: [
      { npcId: "anna", scene: "community_center", position: { x: 1, y: 1 }, dialogueId: "anna_intro" },
      {
        npcId: "gwen",
        scene: "crossroads",
        position: { x: 2, y: 2 },
        dialogueId: "gwen_n01",
        timeParts: [0, 1]
      },
      {
        npcId: "samir",
        scene: "crossroads",
        position: { x: 3, y: 3 },
        dialogueId: "samir_intro",
        timeParts: [2]
      },
      {
        npcId: "sigrid",
        scene: "crossroads",
        position: { x: 4, y: 4 },
        dialogueId: "sigrid_n05",
        conditions: [{ type: "variableEquals", key: "repair_day", value: true }]
      }
    ]
  };

  const alwaysTrue = () => true;

  it("filters by scene", () => {
    expect(activePlacements(file, "community_center", 0, alwaysTrue).map((p) => p.npcId)).toEqual(["anna"]);
  });

  it("filters by part of day (Samir only after his shift, in the evening)", () => {
    const morning = activePlacements(file, "crossroads", 0, alwaysTrue).map((p) => p.npcId);
    const evening = activePlacements(file, "crossroads", 2, alwaysTrue).map((p) => p.npcId);
    expect(morning).toContain("gwen");
    expect(morning).not.toContain("samir");
    expect(evening).toContain("samir");
    expect(evening).not.toContain("gwen");
  });

  it("filters by conditions through the provided checker", () => {
    const withoutFlag = activePlacements(file, "crossroads", 0, (conds) => !conds?.length);
    expect(withoutFlag.map((p) => p.npcId)).not.toContain("sigrid");
    const withFlag = activePlacements(file, "crossroads", 0, alwaysTrue);
    expect(withFlag.map((p) => p.npcId)).toContain("sigrid");
  });
});
