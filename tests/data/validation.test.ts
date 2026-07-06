import { describe, expect, it } from "vitest";
import {
  animationsSchema,
  assetManifestSchema,
  charactersSchema,
  dialogueFileSchema,
  questFileSchema,
  crisisFileSchema,
  DataValidationError,
  validateData
} from "../../src/data/validation";
import assetManifest from "../../src/data/asset_manifest.json";
import charactersData from "../../src/data/characters.json";
import animationsData from "../../src/data/animations.json";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";
import crisesData from "../../src/data/crises.json";

describe("bundled JSON data is valid", () => {
  it("accepts every shipped data file", () => {
    expect(() => validateData("asset_manifest.json", assetManifestSchema, assetManifest)).not.toThrow();
    expect(() => validateData("characters.json", charactersSchema, charactersData)).not.toThrow();
    expect(() => validateData("animations.json", animationsSchema, animationsData)).not.toThrow();
    expect(() => validateData("dialogues.json", dialogueFileSchema, dialoguesData)).not.toThrow();
    expect(() => validateData("quests.json", questFileSchema, questsData)).not.toThrow();
    expect(() => validateData("crises.json", crisisFileSchema, crisesData)).not.toThrow();
  });

  it("ships the NPC quests (N01..N18) and their dialogues", () => {
    const quests = validateData("quests.json", questFileSchema, questsData);
    const dialogues = validateData("dialogues.json", dialogueFileSchema, dialoguesData);
    const questIds = new Set(quests.quests.map((q) => q.id));
    for (let i = 1; i <= 18; i++) expect(questIds.has(`N${String(i).padStart(2, "0")}`)).toBe(true);
    // every dialogue that starts a quest must reference an existing quest
    const allQuests = questIds;
    for (const dialogue of dialogues.dialogues) {
      for (const node of Object.values(dialogue.nodes)) {
        for (const effect of node.effects ?? []) {
          if (effect.type === "startQuest") expect(allQuests.has(effect.questId)).toBe(true);
        }
      }
    }
  });
});

describe("cross-file data consistency", () => {
  it("every dialogue speakerId exists in characters.json", () => {
    const dialogues = validateData("dialogues.json", dialogueFileSchema, dialoguesData);
    const characters = validateData("characters.json", charactersSchema, charactersData);
    const characterIds = new Set(characters.map((c) => c.id));
    for (const dialogue of dialogues.dialogues) {
      expect(characterIds.has(dialogue.speakerId), `speaker "${dialogue.speakerId}" of "${dialogue.id}" missing from characters.json`).toBe(true);
    }
  });

  it("every crisis questState condition references an existing quest", () => {
    const quests = validateData("quests.json", questFileSchema, questsData);
    const crises = validateData("crises.json", crisisFileSchema, crisesData);
    const questIds = new Set(quests.quests.map((q) => q.id));
    for (const crisis of crises.crises) {
      for (const tier of Object.values(crisis.tiers)) {
        for (const condition of tier.conditions) {
          if (condition.type === "questState") {
            expect(questIds.has(condition.questId), `crisis ${crisis.id} references missing quest ${condition.questId}`).toBe(true);
          }
        }
      }
    }
  });

  it("applies the ratified crisis-link fixes (N05 → CRISIS_OFFER, RUMOR buffer = N07)", () => {
    const quests = validateData("quests.json", questFileSchema, questsData);
    const crises = validateData("crises.json", crisisFileSchema, crisesData);
    const n05 = quests.quests.find((q) => q.id === "N05");
    expect(n05?.meta?.crisisLink).toBe("CRISIS_OFFER");
    const rumor = crises.crises.find((c) => c.id === "CRISIS_RUMOR");
    const questConditions = rumor?.tiers.transformative.conditions.filter((c) => c.type === "questState") ?? [];
    // resilience is built BEFORE Crisis Week: the buffer quest is N07, not N06 (day-4 quest)
    expect(questConditions.map((c) => (c.type === "questState" ? c.questId : ""))).toEqual(["N07"]);
  });

  it("N18 is voiced by corporate_man, not the narrator", () => {
    const dialogues = validateData("dialogues.json", dialogueFileSchema, dialoguesData);
    const n18 = dialogues.dialogues.find((d) => d.id === "corporate_n18");
    expect(n18?.speakerId).toBe("corporate_man");
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
