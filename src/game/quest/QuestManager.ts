import type { Quest, QuestFile, QuestStatus } from "../../types/Quest";

export class QuestManager {
  private quests = new Map<string, Quest>();

  load(file: QuestFile): void {
    this.quests.clear();
    for (const quest of file.quests) {
      this.quests.set(quest.id, structuredClone(quest));
    }
  }

  has(questId: string): boolean {
    return this.quests.has(questId);
  }

  getQuestStatus(questId: string): QuestStatus {
    return this.quests.get(questId)?.status ?? "locked";
  }

  startQuest(questId: string): void {
    const quest = this.requireQuest(questId);
    if (quest.status === "completed") return;
    quest.status = "active";
  }

  completeObjective(questId: string, objectiveId: string): void {
    const quest = this.requireQuest(questId);
    const objective = quest.objectives.find((item) => item.id === objectiveId);
    if (!objective) throw new Error(`Objective not found: ${questId}/${objectiveId}`);
    objective.completed = true;

    const requiredObjectives = quest.objectives.filter((item) => item.required !== false);
    if (requiredObjectives.every((item) => item.completed)) {
      quest.status = "completed";
    }
  }

  completeQuest(questId: string): void {
    const quest = this.requireQuest(questId);
    for (const objective of quest.objectives) {
      objective.completed = true;
    }
    quest.status = "completed";
  }

  getActiveQuests(): Quest[] {
    return [...this.quests.values()].filter((quest) => quest.status === "active");
  }

  snapshot(): Quest[] {
    return [...this.quests.values()].map((quest) => structuredClone(quest));
  }

  restore(quests: Quest[]): void {
    this.quests.clear();
    for (const quest of quests) {
      this.quests.set(quest.id, structuredClone(quest));
    }
  }

  private requireQuest(questId: string): Quest {
    const quest = this.quests.get(questId);
    if (!quest) throw new Error(`Quest not found: ${questId}`);
    return quest;
  }
}
