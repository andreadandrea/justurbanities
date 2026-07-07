import type { Condition, Effect } from "./Dialogue";

/** Tunable numbers for the assembly (§7) — thresholds live in data, not code. */
export type AssemblyTuning = {
  /** Preparation slots (§7.1): empty slots become "what was missed" entries. */
  storySlots: number;
  dataSlots: number;
  inviteSlots: number;
  /** Cost reduction per resource on measures backed by a played story (§7.3). */
  storyDiscount: number;
  /** |heart − numbers| beyond this skews the room tone (§7.3). */
  toneGap: number;
  /** Commitment deadlines offered, in days from signing (§7.6). */
  deadlineOptions: number[];
  /** Verification criteria ids (i18n: content.assembly.verifications.<id>). */
  verificationOptions: string[];
};

/** Who can be in the room (§7.2). Absent entries keep their names — and groups. */
export type AssemblyAttendee = {
  npcId: string;
  /** Social group for the "≥ 2 groups absent" ending condition (§9.4). */
  group: string;
  conditions: Condition[];
  /** Relaxed conditions used when the player spends an invite slot (§7.1). */
  invitedConditions?: Condition[];
};

/** A story or data set the player can bring to the table (§7.1/§7.3). */
export type AssemblyStory = {
  id: string;
  kind: "story" | "data";
  requires: Condition[];
  /** Measures whose weight changes when this story is played (§7.3). */
  measures: string[];
};

export type AssemblyPosition = {
  id: string;
  kind: "synthesis" | "partisan" | "evasion";
  /** Synthesis costs resources up front (§7.4). */
  cost?: Record<string, number>;
  effects?: Effect[];
};

export type AssemblyConflict = {
  id: string;
  conditions: Condition[];
  positions: AssemblyPosition[];
};

export type AssemblyMeasure = {
  id: string;
  category: string;
  cost: Record<string, number>;
  effects?: Effect[];
};

export type AssemblyFile = {
  schema?: string;
  note?: string;
  tuning: AssemblyTuning;
  attendance: AssemblyAttendee[];
  stories: AssemblyStory[];
  conflicts: AssemblyConflict[];
  /** The 10 plan categories (§7.5) — coverage counts, not quantity. */
  categories: string[];
  measures: AssemblyMeasure[];
};

export type AssemblyPhase =
  | "preparation"
  | "room"
  | "stories"
  | "conflicts"
  | "plan"
  | "commitment"
  | "done";

/** Names, dates and reviews — what Alexandria signs (§7.6). */
export type AssemblyCommitment = {
  owner: string;
  deadlineDay: number;
  verification: string;
};

/** The whole assembly state; serialized as JSON into a save variable. */
export type AssemblyPlanState = {
  version: 1;
  phase: AssemblyPhase;
  stories: string[];
  data: string[];
  invited: string[];
  /** One entry per empty preparation slot → report "what was missed" (§7.1). */
  missedSlots: string[];
  present: string[];
  absent: Array<{ npcId: string; group: string }>;
  played: string[];
  heart: number;
  numbers: number;
  /** conflictId → chosen positionId (§7.4). */
  conflicts: Record<string, string>;
  evasions: number;
  /** measureId → commitment (null until the commitment phase signs it). */
  measures: Record<string, AssemblyCommitment | null>;
  overpromise: boolean;
  finalizedOnDay?: number;
};
