import type { AssetLoader } from "../assets/AssetLoader";
import type { CanvasRenderer } from "../engine/CanvasRenderer";
import type { InputManager } from "../engine/InputManager";
import type { RenderableEntity } from "../types/Entity";
import type { DialogueNode } from "../types/Dialogue";
import type { DialogueUI } from "../ui/DialogueUI";
import type { GameState } from "../game/GameState";
import type { DialogueManager } from "../game/dialogue/DialogueManager";
import type { QuestManager } from "../game/quest/QuestManager";
import type { SaveRepository } from "../storage/SaveRepository";
import type { ProgressRepository } from "../storage/ProgressRepository";
import type { SyncQueue } from "../sync/SyncQueue";
import charactersData from "../data/characters.json";

type SceneDeps = {
  renderer: CanvasRenderer;
  input: InputManager;
  assets: AssetLoader;
  dialogueUI: DialogueUI;
  gameState: GameState;
  dialogueManager: DialogueManager;
  questManager: QuestManager;
  saveRepository: SaveRepository;
  progressRepository: ProgressRepository;
  syncQueue: SyncQueue;
  sessionId: string;
  saveStatus: HTMLElement;
};

const DISPLAY_NAMES = new Map(
  (charactersData as Array<{ id: string; displayName: string }>).map((character) => [
    character.id,
    character.displayName
  ])
);

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
      if (npc) this.openDialogue(npc.id);
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

  private openDialogue(npcId: string): void {
    const dialogueId = `${npcId}_intro`;
    if (!this.deps.dialogueManager.has(dialogueId)) {
      console.warn(`No dialogue defined for ${npcId}`);
      return;
    }
    const node = this.deps.dialogueManager.start(dialogueId);
    this.showNode(npcId, node);
  }

  private showNode(npcId: string, node: DialogueNode): void {
    this.deps.dialogueUI.show({
      speaker: DISPLAY_NAMES.get(npcId) ?? npcId,
      text: node.text,
      choices: node.choices.map((choice) => ({ id: choice.id, label: choice.label })),
      onChoice: (choice) => {
        void this.handleChoice(npcId, choice.id);
      }
    });
  }

  private async handleChoice(npcId: string, choiceId: string): Promise<void> {
    // Choice and node-entry effects (variables, resources, quest state) are
    // applied by DialogueManager through the EffectResolver.
    const result = this.deps.dialogueManager.choose(choiceId);

    await this.recordChoice(npcId, choiceId);

    if (!result.ended && result.node) {
      this.showNode(npcId, result.node);
    }
  }

  private async recordChoice(npcId: string, choiceId: string): Promise<void> {
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
    await this.deps.saveRepository.save(this.userId, this.deps.sessionId, {
      ...this.deps.gameState.snapshot(),
      quests: this.deps.questManager.snapshot()
    });
    this.deps.saveStatus.textContent = `Saved locally ${new Date().toLocaleTimeString()}`;
  }
}
