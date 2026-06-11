import type { AssetLoader } from "../assets/AssetLoader";
import type { CanvasRenderer } from "../engine/CanvasRenderer";
import type { InputManager } from "../engine/InputManager";
import type { RenderableEntity } from "../types/Entity";
import type { DialogueUI } from "../ui/DialogueUI";
import type { GameState } from "../game/GameState";
import type { SaveRepository } from "../storage/SaveRepository";
import type { ProgressRepository } from "../storage/ProgressRepository";
import type { SyncQueue } from "../sync/SyncQueue";

type SceneDeps = {
  renderer: CanvasRenderer;
  input: InputManager;
  assets: AssetLoader;
  dialogueUI: DialogueUI;
  gameState: GameState;
  saveRepository: SaveRepository;
  progressRepository: ProgressRepository;
  syncQueue: SyncQueue;
  sessionId: string;
  saveStatus: HTMLElement;
};

export class CommunityCenterScene {
  private readonly userId = "local-user";
  private saveCooldown = 0;

  private readonly npcs: RenderableEntity[];

  constructor(private readonly deps: SceneDeps) {
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

  update(dt: number): void {
    const axis = this.deps.input.axis();
    const speed = 180;

    this.deps.gameState.player.x += axis.x * speed * dt;
    this.deps.gameState.player.y += axis.y * speed * dt;

    const target = this.deps.input.pointerTarget;
    if (target) {
      const dx = target.x - this.deps.gameState.player.x;
      const dy = target.y - this.deps.gameState.player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 5) {
        this.deps.gameState.player.x += (dx / distance) * speed * dt;
        this.deps.gameState.player.y += (dy / distance) * speed * dt;
      } else {
        this.deps.input.pointerTarget = null;
      }
    }

    if (this.deps.input.consumeInteract()) {
      const npc = this.findNearbyNpc();
      if (npc) void this.openDialogue(npc.id);
    }

    this.saveCooldown -= dt;
    if (this.saveCooldown <= 0) {
      this.saveCooldown = 2;
      void this.autosave();
    }
  }

  render(): void {
    const renderer = this.deps.renderer;
    renderer.clear();
    renderer.drawBackground();

    const player: RenderableEntity = {
      id: "maya",
      label: "Maya",
      x: this.deps.gameState.player.x,
      y: this.deps.gameState.player.y,
      width: 132,
      height: 132,
      image: this.deps.assets.getImage("maya:icon"),
      interactive: false
    };

    renderer.drawEntities([...this.npcs, player]);
  }

  private findNearbyNpc(): RenderableEntity | undefined {
    const player = this.deps.gameState.player;
    return this.npcs.find((npc) => Math.hypot(npc.x - player.x, npc.y - player.y) < 160);
  }

  private async openDialogue(npcId: string): Promise<void> {
    const speaker = npcId === "anna" ? "Anna" : "Ben";
    const text =
      npcId === "anna"
        ? "The city map is not just about streets. It is about who can actually use them."
        : "Accessibility is not a special request. It is how the city becomes public.";

    this.deps.dialogueUI.show({
      speaker,
      text,
      choices: [
        { id: "listen", label: "Listen carefully." },
        { id: "ask", label: "Ask what should change first." }
      ],
      onChoice: (choice) => {
        void this.recordChoice(npcId, choice.id);
      }
    });
  }

  private async recordChoice(npcId: string, choiceId: string): Promise<void> {
    this.deps.gameState.variables[`talkedTo_${npcId}`] = true;
    this.deps.gameState.resources.voice += 1;

    const event = await this.deps.progressRepository.append(
      this.deps.sessionId,
      this.userId,
      "dialogue_choice",
      { npcId, choiceId, scene: "community_center" }
    );

    await this.deps.syncQueue.enqueue("progress_event", event.id, "create", event);
    await this.autosave();
  }

  private async autosave(): Promise<void> {
    await this.deps.saveRepository.save(this.userId, this.deps.sessionId, this.deps.gameState.snapshot());
    this.deps.saveStatus.textContent = `Saved locally ${new Date().toLocaleTimeString()}`;
  }
}
