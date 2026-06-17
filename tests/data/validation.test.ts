import { describe, expect, it } from "vitest";
import {
  animationsSchema,
  assetManifestSchema,
  charactersSchema,
  dialogueFileSchema,
  questFileSchema,
  npcsSchema,
  DataValidationError,
  validateData
} from "../../src/data/validation";
import assetManifest from "../../src/data/asset_manifest.json";
import charactersData from "../../src/data/characters.json";
import animationsData from "../../src/data/animations.json";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";
import npcsData from "../../src/data/npcs.json";

describe("bundled JSON data is valid", () => {
  it("accepts every shipped data file", () => {
    expect(() => validateData("asset_manifest.json", assetManifestSchema, assetManifest)).not.toThrow();
    expect(() => validateData("characters.json", charactersSchema, charactersData)).not.toThrow();
    expect(() => validateData("animations.json", animationsSchema, animationsData)).not.toThrow();
    expect(() => validateData("dialogues.json", dialogueFileSchema, dialoguesData)).not.toThrow();
    expect(() => validateData("quests.json", questFileSchema, questsData)).not.toThrow();
    expect(() => validateData("npcs.json", npcsSchema, npcsData)).not.toThrow();
  });

  it("checks that every NPC placement points at a real dialogue and scene", () => {
    const dialogueIds = new Set(dialoguesData.dialogues.map((d) => d.id));
    const scenes = new Set(["community_center", "crossroads"]);
    for (const npc of npcsData.npcs) {
      for (const placement of npc.placements) {
        expect(dialogueIds, `${npc.id} dialogue`).toContain(placement.dialogueId);
        expect(scenes, `${npc.id} scene`).toContain(placement.scene);
      }
    }
  });
});

describe("validation errors are clear", () => {
  it("names the file and the offending path", () => {
    const broken = { quests: [{ id: "X", title: "", description: "", status: "weird", objectives: [] }] };
    try {
      validateData("quests.json", questFileSchema, broken);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(DataValidationError);
      const message = (error as Error).message;
      expect(message).toContain("Invalid quests.json");
      expect(message).toContain("quests.0.status");
    }
  });

  it("rejects dialogues whose choices point to missing nodes", () => {
    const broken = {
      dialogues: [
        {
          id: "d1",
          speakerId: "anna",
          startNode: "start",
          nodes: {
            start: {
              text: "Hi",
              choices: [{ id: "go", label: "Go", next: "missing_node" }]
            }
          }
        }
      ]
    };
    expect(() => validateData("dialogues.json", dialogueFileSchema, broken)).toThrowError(
      /next node "missing_node" does not exist/
    );
  });

  it("rejects dialogues whose startNode does not exist", () => {
    const broken = {
      dialogues: [
        { id: "d1", speakerId: "anna", startNode: "nope", nodes: {} }
      ]
    };
    expect(() => validateData("dialogues.json", dialogueFileSchema, broken)).toThrowError(
      /startNode "nope" does not exist/
    );
  });

  it("rejects malformed animations", () => {
    const broken = { maya: { atlas: "maya_atlas", frameRate: -2, animations: { idle: [] } } };
    expect(() => validateData("animations.json", animationsSchema, broken)).toThrow(DataValidationError);
  });
});
