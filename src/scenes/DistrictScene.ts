import type { RenderableEntity } from "../types/Entity";
import type { WorldSize } from "../engine/CanvasRenderer";
import { BaseScene, type Interactable, type SceneDeps } from "./BaseScene";
import type { BarrierPin } from "../game/story/BarrierMap";
import type { Condition } from "../types/Dialogue";

/** Condition-gated hotspot opening a dialogue (assessments, site visits). */
export type DistrictPoi = {
  id: string;
  x: number;
  y: number;
  labelKey: string;
  dialogueId: string;
  conditions?: Condition[];
};

export type DistrictConfig = {
  id: string;
  displayName: string;
  world: WorldSize;
  ground: [string, string];
  landmark?: { x: number; y: number; width: number; height: number; color: string; label: string };
  /** §4.2 Mission 2 — documentable lived-barrier spots. */
  barriers?: BarrierPin[];
  /** Story hotspots (e.g. §4.4 Courtyard 17 assessment). */
  pois?: DistrictPoi[];
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

  /** Mission-2 pins: visible only while M22 is active and undocumented. */
  private activeBarrierPins(): BarrierPin[] {
    if (!this.deps.barrierMap.active()) return [];
    return (this.config.barriers ?? []).filter((pin) => !this.deps.barrierMap.documented(pin.id));
  }

  /** Story hotspots whose conditions currently hold. */
  private activePois(): DistrictPoi[] {
    return (this.config.pois ?? []).filter((poi) => this.deps.checkConditions(poi.conditions));
  }

  private poiEntity(poi: DistrictPoi): RenderableEntity {
    return {
      id: `poi_${poi.id}`,
      label: this.deps.i18n.t(poi.labelKey),
      x: poi.x,
      y: poi.y,
      width: 130,
      height: 130,
      color: "#6e9a5a",
      interactive: true
    };
  }

  private barrierEntity(pin: BarrierPin): RenderableEntity {
    return {
      id: `barrier_${pin.id}`,
      label: `📍 ${this.deps.i18n.t(`content.barriers.${pin.id}.label`)}`,
      x: pin.x,
      y: pin.y,
      width: 110,
      height: 110,
      color: "#b04a3c",
      interactive: true
    };
  }

  protected interactables(): Interactable[] {
    return [
      ...this.npcInteractables(),
      ...this.activeBarrierPins().map((pin) => ({
        entity: this.barrierEntity(pin),
        onInteract: () =>
          this.dialogueRunner.run(`barrier_${pin.id}`, this.deps.i18n.t(`content.barriers.${pin.id}.label`))
      })),
      ...this.activePois().map((poi) => ({
        entity: this.poiEntity(poi),
        onInteract: () => this.dialogueRunner.run(poi.dialogueId, this.deps.i18n.t(poi.labelKey))
      })),
      {
        entity: this.returnDoor,
        onInteract: () => this.deps.changeScene("crossroads", { x: 350, y: 700 })
      }
    ];
  }

  protected override async recordChoice(dialogueId: string, choiceId: string): Promise<void> {
    // §4.2 — "document" turns the spot into a pin: Voice (capped), progress
    // event, and the third pin completes M22. Mechanics live in BarrierMap.
    if (choiceId === "document" && dialogueId.startsWith("barrier_")) {
      const pinId = dialogueId.slice("barrier_".length);
      const pin = (this.config.barriers ?? []).find((candidate) => candidate.id === pinId);
      if (pin) this.deps.barrierMap.document(pin.id, pin.layer);
    }
    await super.recordChoice(dialogueId, choiceId);
  }

  protected drawScene(): void {
    const renderer = this.deps.renderer;
    renderer.drawGround(this.world, this.config.ground[0], this.config.ground[1]);
    const landmark = this.config.landmark;
    if (landmark) {
      renderer.drawLandmark(landmark.x, landmark.y, landmark.width, landmark.height, landmark.color, landmark.label);
    }
    renderer.drawEntities([
      ...this.activeBarrierPins().map((pin) => this.barrierEntity(pin)),
      ...this.activePois().map((poi) => this.poiEntity(poi)),
      ...this.npcEntities(),
      this.returnDoor,
      this.playerEntity()
    ]);
  }
}
