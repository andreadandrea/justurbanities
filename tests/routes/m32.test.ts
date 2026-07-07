import { describe, expect, it } from "vitest";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { AllocationMinigame, type MinigameDefinition } from "../../src/game/minigame/AllocationMinigame";
import { dialogueFileSchema, minigamesFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { DialogueFile } from "../../src/types/Dialogue";
import type { QuestFile } from "../../src/types/Quest";
import dialoguesData from "../../src/data/dialogues.json";
import questsData from "../../src/data/quests.json";
import minigamesData from "../../src/data/minigames.json";

type MinigameEntry = MinigameDefinition & {
  triggerVariable: string;
  doneVariable: string;
  questId?: string;
  objectiveId?: string;
};

function world() {
  const state = new GameState();
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const dialogues = new DialogueManager(resolver);
  dialogues.load(validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile);
  const minigames = (validateData("minigames.json", minigamesFileSchema, minigamesData) as { minigames: MinigameEntry[] })
    .minigames;
  return { state, quests, resolver, dialogues, minigames };
}

describe("M32 — Make It Usable (§5.2): the Saturday is the mission", () => {
  it("the minigame trigger moved off sigrid_n05 onto the mission dialogue", () => {
    const file = validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile;
    const n05 = file.dialogues.find((dialogue) => dialogue.id === "sigrid_n05");
    const setsTrigger = (nodes: typeof n05.nodes) =>
      Object.values(nodes).some((node) =>
        [...(node.effects ?? []), ...node.choices.flatMap((choice) => choice.effects ?? [])].some(
          (effect) => effect.type === "setVariable" && effect.key === "minigame_repair_start"
        )
      );
    expect(setsTrigger(n05!.nodes)).toBe(false);
    const m32 = file.dialogues.find((dialogue) => dialogue.id === "sigrid_m32");
    expect(setsTrigger(m32!.nodes)).toBe(true);
  });

  it("modular_repair is linked to M32 and finishing completes the mission", () => {
    const w = world();
    const definition = w.minigames.find((candidate) => candidate.id === "modular_repair")!;
    expect(definition.questId).toBe("M32");
    expect(definition.objectiveId).toBe("repair_saturday");

    w.dialogues.start("sigrid_m32");
    w.dialogues.choose("engage");
    w.dialogues.choose("close");
    expect(w.quests.getQuestStatus("M32")).toBe("active");
    expect(w.state.variables.minigame_repair_start).toBe(true);

    // what App.onFinished does once the panel closes
    const game = new AllocationMinigame(definition);
    game.finish(() => {});
    w.state.variables[definition.doneVariable] = true;
    w.resolver.apply({ type: "completeObjective", questId: definition.questId!, objectiveId: definition.objectiveId! });
    expect(w.quests.getQuestStatus("M32")).toBe("completed");
  });

  it("the ch.2 assessment sheet pre-fills the flagged axes (§4.4 → §5.2)", () => {
    const w = world();
    // mirrors App.assessmentPrefill()
    const prefill = () => {
      if (w.state.variables.m24_assessed !== true) return undefined;
      const flagged = ["aesthetic", "social", "practical", "accessible"].filter(
        (axis) => w.state.variables[`m24_${axis}`] === "fails"
      );
      return flagged.length ? flagged : undefined;
    };
    expect(prefill()).toBeUndefined(); // no sheet, no note

    w.state.variables.m24_assessed = true;
    w.state.variables.m24_social = "fails";
    w.state.variables.m24_practical = "fails";
    w.state.variables.m24_aesthetic = "works";
    expect(prefill()).toEqual(["social", "practical"]);
  });
});
