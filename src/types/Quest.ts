import type { Effect } from "./Dialogue";

export type QuestFile = {
  quests: Quest[];
};

export type QuestStatus = "locked" | "available" | "active" | "completed";

export type Quest = {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  rewards?: Effect[];
};

export type QuestObjective = {
  id: string;
  description: string;
  completed: boolean;
  required?: boolean;
};
