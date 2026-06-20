import type { Condition } from "./Dialogue";

/**
 * Crisis Week extension (proposal). Not yet consumed by the engine — a
 * future CrisisManager evaluates `tiers` in order transformative →
 * coordinated → reactive using the existing Condition vocabulary
 * (resourceAtLeast / questState). `reactive` has no conditions (always true).
 * See docs/game-design/INTEGRATION_NPC_Quests.md.
 */
export type CrisisTier = "transformative" | "coordinated" | "reactive";

export type Crisis = {
  id: string;
  day: number;
  title: string;
  type: string;
  convergingNeeds: string[];
  bufferResources: string[];
  resultVariable: string;
  tiers: Record<CrisisTier, { conditions: Condition[] }>;
};

export type CrisisFile = {
  schema?: string;
  note?: string;
  crises: Crisis[];
};
