import { describe, expect, it } from "vitest";
import { QuestManager } from "../../src/game/quest/QuestManager";
import type { QuestFile } from "../../src/types/Quest";
import questsData from "../../src/data/quests.json";

const questFile = questsData as unknown as QuestFile;

describe("QuestManager", () => {
  it("starts P01 and completes it when both required objectives are done", () => {
    const manager = new QuestManager();
    manager.load(questFile);

    expect(manager.getQuestStatus("P01")).toBe("available");

    manager.startQuest("P01");
    expect(manager.getQuestStatus("P01")).toBe("active");

    manager.completeObjective("P01", "talk_to_anna");
    expect(manager.getQuestStatus("P01")).toBe("active");

    manager.completeObjective("P01", "talk_to_ben");
    expect(manager.getQuestStatus("P01")).toBe("completed");
  });

  it("survives a snapshot/restore round trip", () => {
    const manager = new QuestManager();
    manager.load(questFile);
    manager.startQuest("P01");
    manager.completeObjective("P01", "talk_to_anna");

    const restored = new QuestManager();
    restored.load(questFile);
    restored.restore(manager.snapshot());

    expect(restored.getQuestStatus("P01")).toBe("active");
    const p01 = restored.snapshot().find((quest) => quest.id === "P01");
    expect(p01?.objectives.find((o) => o.id === "talk_to_anna")?.completed).toBe(true);
    expect(p01?.objectives.find((o) => o.id === "talk_to_ben")?.completed).toBe(false);
  });

  it("does not reactivate a completed quest", () => {
    const manager = new QuestManager();
    manager.load(questFile);
    manager.startQuest("P01");
    manager.completeQuest("P01");
    manager.startQuest("P01");
    expect(manager.getQuestStatus("P01")).toBe("completed");
  });
});
