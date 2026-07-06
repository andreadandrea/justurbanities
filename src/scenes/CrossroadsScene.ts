import type { RenderableEntity } from "../types/Entity";
import type { WorldSize } from "../engine/CanvasRenderer";
import { BaseScene, type Interactable, type SceneDeps } from "./BaseScene";

type Poi = {
  entity: RenderableEntity;
  dialogueId: string;
  speakerLabel: string;
};

/**
 * Task 6 — first district test scene, now in the 3/4 follow-camera world:
 * bus hub, market, narrow crossing and civic info point placeholders.
 * Narrative content lives in dialogues.json; reaching the bus hub completes C01.
 */
export class CrossroadsScene extends BaseScene {
  readonly sceneId = "crossroads";
  readonly displayName = "The Crossroads";
  readonly world: WorldSize = { width: 2200, height: 1500 };

  private readonly pois: Poi[];
  private readonly returnDoor: RenderableEntity = {
    id: "door_community_center",
    label: "← Community Center",
    x: 110,
    y: 700,
    width: 96,
    height: 150,
    color: "#8a5a2c",
    interactive: true
  };

  constructor(deps: SceneDeps) {
    super(deps);
    const poi = (id: string, label: string, x: number, y: number, color: string): Poi => ({
      entity: { id, label, x, y, width: 150, height: 150, color, interactive: true },
      dialogueId: `crossroads_${id}`,
      speakerLabel: label
    });

    this.pois = [
      poi("bus_hub", "Main Bus Hub", 560, 460, "#3c6b73"),
      poi("market", "Market", 1180, 900, "#a2412c"),
      poi("narrow_crossing", "Narrow Crossing", 1640, 520, "#7a5c9e"),
      poi("info_point", "Civic Info Point", 940, 1120, "#6e9a5a")
    ];
  }

  override enter(): void {
    if (this.deps.gameState.variables.crossroadsIntroSeen !== true) {
      this.dialogueRunner.run("crossroads_intro", "Crossroads");
    }
  }

  protected interactables(): Interactable[] {
    return [
      ...this.pois.map((poi) => ({
        entity: poi.entity,
        onInteract: () => this.dialogueRunner.run(poi.dialogueId, poi.speakerLabel)
      })),
      {
        entity: this.returnDoor,
        onInteract: () => this.deps.changeScene("community_center", { x: 1900, y: 700 })
      }
    ];
  }

  protected drawScene(): void {
    const renderer = this.deps.renderer;
    renderer.drawGround(this.world, "#eccf95", "#cf9f63");
    const entities: RenderableEntity[] = [
      ...this.pois.map((poi) => poi.entity),
      this.returnDoor,
      this.playerEntity()
    ];
    renderer.drawEntities(entities);
  }
}
