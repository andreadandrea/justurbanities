import type { Effect } from "../../types/Dialogue";

/**
 * Task 9.1 — reusable allocation mini-game (pilot: Sigrid's Modular
 * Repair, §5.2). Generic shape: a pool of salvaged materials with tags,
 * a set of needs that each accept certain tags and want a number of
 * pieces. Every valid combination scores; failing never punishes — the
 * player just reassigns and tries again ("Again. Wood forgives.").
 * All content comes from minigames.json; this class is pure logic.
 */

export type MinigameMaterial = {
  id: string;
  tags: string[];
};

export type MinigameNeed = {
  id: string;
  /** A placed material must carry at least one of these tags. */
  accepts: string[];
  /** How many pieces the need wants (exactly). */
  required: number;
};

export type MinigameDefinition = {
  id: string;
  materials: MinigameMaterial[];
  needs: MinigameNeed[];
  /** Applied once per valid need on finish (e.g. Commons +1). */
  rewardPerValidNeed: Effect[];
};

export type NeedStatus = "empty" | "partial" | "valid" | "invalid";

export class AllocationMinigame {
  /** materialId → needId */
  private placements = new Map<string, string>();

  constructor(private readonly definition: MinigameDefinition) {}

  get id(): string {
    return this.definition.id;
  }

  materials(): MinigameMaterial[] {
    return this.definition.materials;
  }

  needs(): MinigameNeed[] {
    return this.definition.needs;
  }

  /** Where a material currently sits (undefined = still in the pile). */
  placementOf(materialId: string): string | undefined {
    return this.placements.get(materialId);
  }

  assigned(needId: string): MinigameMaterial[] {
    return this.definition.materials.filter((material) => this.placements.get(material.id) === needId);
  }

  /** Place a material on a need (moving it from wherever it was). */
  assign(materialId: string, needId: string): boolean {
    const material = this.definition.materials.some((candidate) => candidate.id === materialId);
    const need = this.definition.needs.find((candidate) => candidate.id === needId);
    if (!material || !need) return false;
    if (this.assigned(needId).length >= need.required && this.placements.get(materialId) !== needId) return false;
    this.placements.set(materialId, needId);
    return true;
  }

  /** Send a material back to the pile — trying again is free. */
  unassign(materialId: string): void {
    this.placements.delete(materialId);
  }

  needStatus(needId: string): NeedStatus {
    const need = this.definition.needs.find((candidate) => candidate.id === needId);
    if (!need) return "empty";
    const pieces = this.assigned(needId);
    if (pieces.length === 0) return "empty";
    const allFit = pieces.every((material) => material.tags.some((tag) => need.accepts.includes(tag)));
    if (!allFit) return "invalid";
    return pieces.length === need.required ? "valid" : "partial";
  }

  /** Valid needs right now — every one is worth the per-need reward. */
  score(): number {
    return this.definition.needs.filter((need) => this.needStatus(need.id) === "valid").length;
  }

  isComplete(): boolean {
    return this.score() === this.definition.needs.length;
  }

  /**
   * Close the Saturday: the per-need reward fires once per valid need.
   * Returns the score so callers can log it.
   */
  finish(applyEffects: (effects: Effect[]) => void): number {
    const score = this.score();
    for (let i = 0; i < score; i++) applyEffects(this.definition.rewardPerValidNeed);
    return score;
  }
}
