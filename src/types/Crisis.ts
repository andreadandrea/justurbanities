import type { Condition, Effect } from "./Dialogue";

/**
 * Crisis Week data. The CrisisManager evaluates `tiers` in order
 * transformative → coordinated → reactive using the existing Condition
 * vocabulary (resourceAtLeast / questState). `reactive` has no conditions
 * (always true). Optional per-tier `effects` are applied on resolution
 * (balancing data lands in Phase 9.4).
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
  tiers: Record<CrisisTier, { conditions: Condition[]; effects?: Effect[] }>;
};

export type CrisisFile = {
  schema?: string;
  note?: string;
  crises: Crisis[];
};
