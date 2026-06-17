import type { RenderableEntity } from "../types/Entity";
import type { WorldSize } from "../engine/CanvasRenderer";
import { BaseScene, type Interactable } from "./BaseScene";

export class CommunityCenterScene extends BaseScene {
  readonly sceneId = "community_center";
  readonly world: WorldSize = { width: 2000, height: 1300 };

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

  protected interactables(): Interactable[] {
    return [
      ...this.npcInteractables(),
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

    const entities: RenderableEntity[] = [...this.npcEntities(), this.exitDoor, this.playerEntity()];
    renderer.drawEntities(entities);
  }
}
