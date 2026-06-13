import type { AssetLoader } from "../assets/AssetLoader";
import type { CanvasRenderer } from "../engine/CanvasRenderer";
import type { InputManager } from "../engine/InputManager";
import type { RenderableEntity } from "../types/Entity";
import type { DialogueUI } from "../ui/DialogueUI";
import type { GameState } from "../game/GameState";
import type { DialogueManager } from "../game/dialogue/DialogueManager";
import { DialogueRunner } from "../game/dialogue/DialogueRunner";
import type { QuestManager } from "../game/quest/QuestManager";
import type { SaveRepository } from "../storage/SaveRepository";
import type { ProgressRepository } from "../storage/ProgressRepository";
import type { SyncQueue } from "../sync/SyncQueue";

export type SceneDeps = {
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
  changeScene: (sceneId: string, spawn: { x: number; y: number }) => void;
};

/** An entity the player can walk up to and activate with space/enter/tap. */
export type Interactable = {
  entity: RenderableEntity;
  onInteract: () => void;
};

const INTERACT_RANGE = 160;
const PLAYER_SPEED = 180;
const AUTOSAVE_INTERVAL = 2;

/**
 * Shared walk-and-interact scene behaviour: player movement (keys +
 * pointer), proximity interaction, dialogue running with progress event
 * logging, and autosave including the quest snapshot.
 */
export abstract class BaseScene {
  protected readonly userId = "local-user";
  protected readonly dialogueRunner: DialogueRunner;
  private saveCooldown = 0;

  constructor(protected readonly deps: SceneDeps) {
    this.dialogueRunner = new DialogueRunner(deps.dialogueUI, deps.dialogueManager, (dialogueId, choiceId) =>
      this.recordChoice(dialogueId, choiceId)
    );
  }

  /** Scene id used in GameState.currentScene and progress events. */
  abstract readonly sceneId: string;

  /** Entities the player can interact with (recomputed each frame). */
  protected abstract interactables(): Interactable[];

  protected abstract drawScene(): void;

  /** Called when the player enters the scene (and on boot for the active scene). */
  enter(): void {}

  update(dt: number): void {
    const axis = this.deps.input.axis();

    this.deps.gameState.player.x += axis.x * PLAYER_SPEED * dt;
    this.deps.gameState.player.y += axis.y * PLAYER_SPEED * dt;

    const target = this.deps.input.pointerTarget;
    if (target) {
      const dx = target.x - this.deps.gameState.player.x;
      const dy = target.y - this.deps.gameState.player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 5) {
        this.deps.gameState.player.x += (dx / distance) * PLAYER_SPEED * dt;
        this.deps.gameState.player.y += (dy / distance) * PLAYER_SPEED * dt;
      } else {
        this.deps.input.pointerTarget = null;
      }
    }

    if (this.deps.input.consumeInteract()) {
      const nearby = this.findNearbyInteractable();
      if (nearby) nearby.onInteract();
    }

    this.saveCooldown -= dt;
    if (this.saveCooldown <= 0) {
      this.saveCooldown = AUTOSAVE_INTERVAL;
      void this.autosave();
    }
  }

  render(): void {
    this.drawScene();
  }

  protected playerEntity(): RenderableEntity {
    const character = this.deps.gameState.currentCharacter;
    return {
      id: "player",
      label: this.deps.gameState.playerName || character,
      x: this.deps.gameState.player.x,
      y: this.deps.gameState.player.y,
      width: 132,
      height: 132,
      image: this.deps.assets.getImage(`${character}:icon`),
      interactive: false
    };
  }

  private findNearbyInteractable(): Interactable | undefined {
    const player = this.deps.gameState.player;
    let best: Interactable | undefined;
    let bestDistance = INTERACT_RANGE;
    for (const candidate of this.interactables()) {
      const distance = Math.hypot(candidate.entity.x - player.x, candidate.entity.y - player.y);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    return best;
  }

  protected async recordChoice(dialogueId: string, choiceId: string): Promise<void> {
    const event = await this.deps.progressRepository.append(
      this.deps.sessionId,
      this.userId,
      "dialogue_choice",
      { dialogueId, choiceId, scene: this.sceneId }
    );

    await this.deps.syncQueue.enqueue("progress_event", event.id, "create", event);
    await this.autosave();
  }

  protected async autosave(): Promise<void> {
    await this.deps.saveRepository.save(this.userId, this.deps.sessionId, {
      ...this.deps.gameState.snapshot(),
      quests: this.deps.questManager.snapshot()
    });
    this.deps.saveStatus.textContent = `Saved locally ${new Date().toLocaleTimeString()}`;
  }
}
