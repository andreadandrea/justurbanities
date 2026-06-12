import type { RenderableEntity } from "../types/Entity";
import { BaseScene, type Interactable, type SceneDeps } from "./BaseScene";

type Poi = {
  entity: RenderableEntity;
  dialogueId: string;
  speakerLabel: string;
};

/**
 * Task 6 — first district test scene: bus hub, market, narrow crossing
 * and civic info point placeholders. All narrative content lives in
 * dialogues.json (crossroads_*); reaching the bus hub completes C01.
 */
export class CrossroadsScene extends BaseScene {
  readonly sceneId = "crossroads";

  private readonly pois: Poi[];
  private readonly returnDoor: RenderableEntity = {
    id: "door_community_center",
    label: "← Community Center",
    x: 110,
    y: 0,
    width: 90,
    height: 120,
    color: "#8a5a2c",
    interactive: true
  };

  constructor(deps: SceneDeps) {
    super(deps);
    const poi = (
      id: string,
      label: string,
      x: number,
      y: number,
      color: string
    ): Poi => ({
      entity: { id, label, x, y, width: 120, height: 120, color, interactive: true },
      dialogueId: `crossroads_${id}`,
      speakerLabel: label
    });

    this.pois = [
      poi("bus_hub", "Main Bus Hub", 420, 330, "#3c6b73"),
      poi("market", "Market", 760, 540, "#a2412c"),
      poi("narrow_crossing", "Narrow Crossing", 1040, 350, "#7a5c9e"),
      poi("info_point", "Civic Info Point", 600, 680, "#6e9a5a")
    ];
  }

  override enter(): void {
    // One-time intro (starts quest C01); the gate variable is set by the
    // dialogue itself, so it survives reloads through the normal save.
    if (this.deps.gameState.variables.crossroadsIntroSeen !== true) {
      this.dialogueRunner.run("crossroads_intro", "Crossroads");
    }
  }

  protected interactables(): Interactable[] {
    this.returnDoor.y = window.innerHeight * 0.7;

    return [
      ...this.pois.map((poi) => ({
        entity: poi.entity,
        onInteract: () => this.dialogueRunner.run(poi.dialogueId, poi.speakerLabel)
      })),
      {
        entity: this.returnDoor,
        onInteract: () => this.deps.changeScene("community_center", { x: 280, y: 440 })
      }
    ];
  }

  protected drawScene(): void {
    const renderer = this.deps.renderer;
    renderer.clear();
    renderer.drawBackground("The Crossroads", "District test scene — who arrives, who waits, who gives up");
    renderer.drawEntities([...this.pois.map((poi) => poi.entity), this.returnDoor, this.playerEntity()]);
  }
}
