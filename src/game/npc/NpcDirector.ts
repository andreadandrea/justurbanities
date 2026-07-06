import type { NpcPlacement } from "../../types/Schedule";

/** A materialized NPC in the world, ready to render and interact with. */
export type DirectedNpc<TSprite = unknown> = {
  id: string;
  x: number;
  y: number;
  dialogueId: string;
  sprite: TSprite | null;
};

export type NpcDirectorDeps<TSprite> = {
  /** Active placements for a scene (schedule × time × conditions). */
  placements: (sceneId: string) => NpcPlacement[];
  /** Sprite factory; called once per NPC and reused across refreshes. */
  createSprite: (npcId: string) => TSprite | null;
};

/**
 * Keeps a scene's NPC roster in sync with the data-driven schedule: NPCs
 * spawn, move and leave as time passes and the story state changes.
 * When several placements match the same NPC, the FIRST one in schedule
 * order wins — so data can express fallbacks ("offer N01, else intro").
 */
export class NpcDirector<TSprite = unknown> {
  private npcs: DirectedNpc<TSprite>[] = [];
  private sceneId = "";

  constructor(private readonly deps: NpcDirectorDeps<TSprite>) {}

  setScene(sceneId: string): void {
    this.sceneId = sceneId;
    this.refresh();
  }

  /** Re-evaluates the schedule; reuses sprites for NPCs that stay. */
  refresh(): void {
    if (!this.sceneId) return;
    const existing = new Map(this.npcs.map((npc) => [npc.id, npc]));
    const seen = new Set<string>();
    const next: DirectedNpc<TSprite>[] = [];

    for (const placement of this.deps.placements(this.sceneId)) {
      if (seen.has(placement.npcId)) continue; // first matching placement wins
      seen.add(placement.npcId);
      next.push({
        id: placement.npcId,
        x: placement.position.x,
        y: placement.position.y,
        dialogueId: placement.dialogueId,
        sprite: existing.get(placement.npcId)?.sprite ?? this.deps.createSprite(placement.npcId)
      });
    }

    this.npcs = next;
  }

  /** Recreate every sprite from the factory (e.g. after an art-style switch). */
  rebuildSprites(): void {
    for (const npc of this.npcs) {
      npc.sprite = this.deps.createSprite(npc.id);
    }
  }

  list(): readonly DirectedNpc<TSprite>[] {
    return this.npcs;
  }
}
