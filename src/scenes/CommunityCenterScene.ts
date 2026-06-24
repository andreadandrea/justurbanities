import type { RenderableEntity } from "../types/Entity";
import type { WorldSize } from "../engine/CanvasRenderer";
import type { AnimatedSprite } from "../engine/AnimatedSprite";
import type { NpcPlacement } from "../game/npc/NpcDirector";
import { BaseScene, type Interactable, type SceneDeps } from "./BaseScene";
import charactersData from "../data/characters.json";

const DISPLAY_NAMES = new Map(
  (charactersData as Array<{ id: string; displayName: string }>).map((character) => [
    character.id,
    character.displayName
  ])
);

type Npc = {
  placement: NpcPlacement;
  sprite: AnimatedSprite | null;
};

export class CommunityCenterScene extends BaseScene {
  readonly sceneId = "community_center";
  readonly world: WorldSize = { width: 2000, height: 1300 };

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

  protected override onTimeChanged(): void {
    this.refreshNpcs();
  }

  /** Ask the director which NPCs belong here now, then (lazily) build sprites. */
  private refreshNpcs(): void {
    const placements = this.deps.npcDirector.npcsForScene(
      this.sceneId,
      this.deps.gameState,
      this.deps.effectResolver
    );
    this.npcs = placements.map((placement) => ({ placement, sprite: null }));
    for (const npc of this.npcs) {
      // Animated frames are optional: load in the background, fall back to icon.
      void this.deps.sprites.load(npc.placement.npcId).then(() => {
        npc.sprite = this.deps.sprites.createSprite(npc.placement.npcId);
      });
    }
  }

  protected interactables(): Interactable[] {
    return [
      ...this.npcs.map((npc) => ({
        entity: this.npcEntity(npc),
        onInteract: () => this.dialogueRunner.run(npc.placement.dialogueId, this.speakerLabel(npc.placement))
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

  private speakerLabel(placement: NpcPlacement): string {
    return placement.speakerLabel ?? DISPLAY_NAMES.get(placement.npcId) ?? placement.npcId;
  }

  private npcEntity(npc: Npc): RenderableEntity {
    const id = npc.placement.npcId;
    const image = npc.sprite?.image() ?? this.deps.assets.getImage(`${id}:icon`);
    return {
      id,
      label: this.speakerLabel(npc.placement),
      x: npc.placement.x,
      y: npc.placement.y,
      width: 132,
      height: 150,
      image,
      interactive: true
    };
  }
}
