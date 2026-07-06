import type { RenderableEntity } from "../types/Entity";
import type { WorldSize } from "../engine/CanvasRenderer";
import { BaseScene, type Interactable, type SceneDeps } from "./BaseScene";

export type DistrictConfig = {
  id: string;
  displayName: string;
  world: WorldSize;
  ground: [string, string];
  landmark?: { x: number; y: number; width: number; height: number; color: string; label: string };
};

/**
 * Generic outer-district scene (task 6.3): simple layout, canon entry text
 * on first arrival (§4.5), scheduled NPCs, and the bus back to Crossroads.
 * The visual pass (Phase M-D) replaces layouts, not this wiring.
 */
export class DistrictScene extends BaseScene {
  readonly sceneId: string;
  readonly displayName: string;
  readonly world: WorldSize;

  private readonly returnDoor: RenderableEntity;

  constructor(
    deps: SceneDeps,
    private readonly config: DistrictConfig
  ) {
    super(deps);
    this.sceneId = config.id;
    this.displayName = config.displayName;
    this.world = config.world;
    this.returnDoor = {
      id: "door_crossroads",
      label: "← Crossroads",
      x: 110,
      y: 700,
      width: 96,
      height: 150,
      color: "#8a5a2c",
      interactive: true
    };
  }

  override enter(): void {
    super.enter();
    const seenKey = `${this.config.id}IntroSeen`;
    if (this.deps.gameState.variables[seenKey] !== true) {
      this.dialogueRunner.run(`district_${this.config.id}_intro`, this.displayName);
    }
  }

  protected interactables(): Interactable[] {
    return [
      ...this.npcInteractables(),
      {
        entity: this.returnDoor,
        onInteract: () => this.deps.changeScene("crossroads", { x: 350, y: 700 })
      }
    ];
  }

  protected drawScene(): void {
    const renderer = this.deps.renderer;
    renderer.drawGround(this.world, this.config.ground[0], this.config.ground[1]);
    const landmark = this.config.landmark;
    if (landmark) {
      renderer.drawLandmark(landmark.x, landmark.y, landmark.width, landmark.height, landmark.color, landmark.label);
    }
    renderer.drawEntities([...this.npcEntities(), this.returnDoor, this.playerEntity()]);
  }
}
