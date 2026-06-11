export type DialogueFile = {
  dialogues: Dialogue[];
};

export type Dialogue = {
  id: string;
  speakerId: string;
  startNode: string;
  nodes: Record<string, DialogueNode>;
};

export type DialogueNode = {
  text: string;
  conditions?: Condition[];
  effects?: Effect[];
  choices: DialogueChoice[];
};

export type DialogueChoice = {
  id: string;
  label: string;
  conditions?: Condition[];
  effects?: Effect[];
  next?: string;
  end?: boolean;
};

export type Condition =
  | { type: "variableEquals"; key: string; value: string | number | boolean }
  | { type: "variableNotEquals"; key: string; value: string | number | boolean }
  | { type: "resourceAtLeast"; key: string; value: number }
  | { type: "resourceBelow"; key: string; value: number }
  | { type: "questState"; questId: string; state: "locked" | "available" | "active" | "completed" };

export type Effect =
  | { type: "setVariable"; key: string; value: string | number | boolean }
  | { type: "addResource"; key: string; value: number }
  | { type: "startQuest"; questId: string }
  | { type: "completeObjective"; questId: string; objectiveId: string }
  | { type: "completeQuest"; questId: string }
  | { type: "createProgressEvent"; eventType: string; payload?: Record<string, unknown> };
