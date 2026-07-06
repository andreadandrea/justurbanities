import type { RenderableEntity } from "../types/Entity";
import type { WorldSize } from "../engine/CanvasRenderer";
import { BaseScene, type Blocker, type Interactable, type SceneDeps } from "./BaseScene";
import districtsData from "../data/districts.json";

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
  private readonly districtDoors: RenderableEntity[];
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

    // Bus departures to the outer districts (chapter 2+): a row of stops
    // along the bottom edge, next to the bus hub's reach.
    this.districtDoors = districtsData.districts.map((district, index) => ({
      id: `bus_${district.id}`,
      label: `🚌 ${district.displayName}`,
      x: 360 + index * 300,
      y: 1400,
      width: 120,
      height: 90,
      color: "#3c6b73",
      interactive: true
    }));
  }

  /** Districts open with chapter 2 ("we map the cracks — all of them"). */
  private districtsUnlocked(): boolean {
    return this.deps.gameState.variables.chapter2_unlocked === true;
  }

  override enter(): void {
    super.enter();
    if (this.deps.gameState.variables.crossroadsIntroSeen !== true) {
      this.dialogueRunner.run("crossroads_intro", "Crossroads");
    }
  }

  protected interactables(): Interactable[] {
    const doors = this.districtsUnlocked()
      ? this.districtDoors.map((door) => ({
          entity: door,
          onInteract: () => this.deps.changeScene(door.id.replace("bus_", ""), { x: 260, y: 700 })
        }))
      : [];
    return [
      ...this.npcInteractables(),
      ...this.pois.map((poi) => ({
        entity: poi.entity,
        onInteract: () => this.dialogueRunner.run(poi.dialogueId, poi.speakerLabel)
      })),
      ...doors,
      {
        entity: this.returnDoor,
        onInteract: () => this.deps.changeScene("community_center", { x: 1900, y: 700 })
      }
    ];
  }

  /** ✳ Samir's route: an overnight construction fence seals Narrow Crossing. */
  private samirFenceActive(): boolean {
    return (
      this.deps.gameState.currentCharacter === "samir" &&
      this.deps.gameState.variables.samir_route_stage === "barrier"
    );
  }

  protected override blockers(): Blocker[] {
    if (!this.samirFenceActive()) return [];
    // A band sealing the Narrow Crossing area (POI at 1640,520).
    return [{ x: 1440, y: 380, width: 400, height: 280 }];
  }

  protected override onBlocked(): void {
    // The player has just SLAMMED into the fence: the beat continues here.
    if (this.deps.gameState.variables.samir_fence_hit !== true) {
      this.deps.gameState.variables.samir_fence_hit = true;
      this.dialogueRunner.run("route_samir_barrier", "Samir");
    }
  }

  protected drawScene(): void {
    const renderer = this.deps.renderer;
    renderer.drawGround(this.world, "#eccf95", "#cf9f63");
    if (this.samirFenceActive()) {
      renderer.drawLandmark(1440, 380, 400, 60, "#8a4a2c", "⚠ Construction fence");
    }
    const entities: RenderableEntity[] = [
      ...this.pois.map((poi) => poi.entity),
      ...this.npcEntities(),
      ...(this.districtsUnlocked() ? this.districtDoors : []),
      this.returnDoor,
      this.playerEntity()
    ];
    renderer.drawEntities(entities);
  }
}
