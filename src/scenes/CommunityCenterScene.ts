import type { RenderableEntity } from "../types/Entity";
import { BaseScene, type Interactable, type SceneDeps } from "./BaseScene";
import charactersData from "../data/characters.json";

const DISPLAY_NAMES = new Map(
  (charactersData as Array<{ id: string; displayName: string }>).map((character) => [
    character.id,
    character.displayName
  ])
);

export class CommunityCenterScene extends BaseScene {
  readonly sceneId = "community_center";

  private readonly npcs: RenderableEntity[];
  private readonly exitDoor: RenderableEntity = {
    id: "door_crossroads",
    label: "→ Crossroads",
    x: 0,
    y: 0,
    width: 90,
    height: 120,
    color: "#8a5a2c",
    interactive: true
  };

  constructor(deps: SceneDeps) {
    super(deps);
    this.npcs = [
      {
        id: "anna",
        label: "Anna",
        x: 620,
        y: 420,
        width: 120,
        height: 120,
        image: this.deps.assets.getImage("anna:icon"),
        interactive: true
      },
      {
        id: "ben",
        label: "Ben",
        x: 820,
        y: 460,
        width: 120,
        height: 120,
        image: this.deps.assets.getImage("ben:icon"),
        interactive: true
      }
    ];
  }

  protected interactables(): Interactable[] {
    this.exitDoor.x = window.innerWidth - 140;
    this.exitDoor.y = window.innerHeight * 0.7;

    return [
      ...this.npcs.map((npc) => ({
        entity: npc,
        onInteract: () => this.dialogueRunner.run(`${npc.id}_intro`, DISPLAY_NAMES.get(npc.id) ?? npc.id)
      })),
      {
        entity: this.exitDoor,
        onInteract: () => this.deps.changeScene("crossroads", { x: 220, y: 480 })
      }
    ];
  }

  protected drawScene(): void {
    const renderer = this.deps.renderer;
    renderer.clear();
    renderer.drawBackground();
    renderer.drawEntities([...this.npcs, this.exitDoor, this.playerEntity()]);
  }
}
