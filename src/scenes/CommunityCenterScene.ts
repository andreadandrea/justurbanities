import type { RenderableEntity } from "../types/Entity";
import type { WorldSize } from "../engine/CanvasRenderer";
import type { AnimatedSprite } from "../engine/AnimatedSprite";
import { BaseScene, type Interactable } from "./BaseScene";
import charactersData from "../data/characters.json";

const DISPLAY_NAMES = new Map(
  (charactersData as Array<{ id: string; displayName: string }>).map((character) => [
    character.id,
    character.displayName
  ])
);

type Npc = { id: string; x: number; y: number; dialogueId: string; sprite: AnimatedSprite | null };

export class CommunityCenterScene extends BaseScene {
  readonly sceneId = "community_center";
  readonly displayName = "Community Center";
  readonly world: WorldSize = { width: 2000, height: 1300 };

  /** Populated from schedule.json on enter() — no hardcoded NPCs. */
  private npcs: Npc[] = [];

  private readonly exitDoor: RenderableEntity = {
    id: "door_crossroads",
    label: "→ Crossroads",
    x: this.world.width - 90,
    y: 700,
    width: 96,
    height: 150,
    color: "#8a5a2c",
    interactive: true
  };

  override enter(): void {
    this.refreshNpcs();
  }

  /** Re-evaluates data-driven placements (schedule.json × time × conditions). */
  private refreshNpcs(): void {
    this.npcs = this.deps.npcPlacements(this.sceneId).map((placement) => ({
      id: placement.npcId,
      x: placement.position.x,
      y: placement.position.y,
      dialogueId: placement.dialogueId,
      sprite: this.deps.sprites.createSprite(placement.npcId)
    }));
  }

  protected interactables(): Interactable[] {
    return [
      ...this.npcs.map((npc) => ({
        entity: this.npcEntity(npc),
        onInteract: () => this.dialogueRunner.run(npc.dialogueId, DISPLAY_NAMES.get(npc.id) ?? npc.id)
      })),
      {
        entity: this.exitDoor,
        onInteract: () => this.deps.changeScene("crossroads", { x: 220, y: 700 })
      }
    ];
  }

  protected drawScene(): void {
    const renderer = this.deps.renderer;
    renderer.drawGround(this.world, "#f7d28a", "#e8a35a");
    // Community Center building footprint as the warm civic heart.
    renderer.drawLandmark(740, 300, 560, 220, "#caa15f", "Community Center");

    const entities: RenderableEntity[] = [
      ...this.npcs.map((npc) => this.npcEntity(npc)),
      this.exitDoor,
      this.playerEntity()
    ];
    renderer.drawEntities(entities);
  }

  private npcEntity(npc: Npc): RenderableEntity {
    const image = npc.sprite?.image() ?? this.deps.assets.getImage(`${npc.id}:icon`);
    return {
      id: npc.id,
      label: DISPLAY_NAMES.get(npc.id) ?? npc.id,
      x: npc.x,
      y: npc.y,
      width: 132,
      height: 150,
      image,
      interactive: true
    };
  }
}
