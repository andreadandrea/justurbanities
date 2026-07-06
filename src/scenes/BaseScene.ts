import type { AssetLoader } from "../assets/AssetLoader";
import type { CanvasRenderer, WorldSize } from "../engine/CanvasRenderer";
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
import type { ResourceHud } from "../ui/ResourceHud";
import type { SpriteRepository } from "../assets/SpriteRepository";
import { Camera2D } from "../engine/Camera2D";
import { AnimatedSprite, movementAnimation, type Direction } from "../engine/AnimatedSprite";
import { cityFilter, cityState, neighbourhoodVitality } from "../game/resources/ResourceManager";

export type SceneDeps = {
  renderer: CanvasRenderer;
  input: InputManager;
  assets: AssetLoader;
  sprites: SpriteRepository;
  dialogueUI: DialogueUI;
  gameState: GameState;
  dialogueManager: DialogueManager;
  questManager: QuestManager;
  resourceHud: ResourceHud;
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
const PLAYER_SPEED = 220;
const AUTOSAVE_INTERVAL = 2;
const PLAYER_HEIGHT = 150;
const EDGE_MARGIN = 40;

/**
 * Shared walk-and-interact scene behaviour for the 3/4 follow-camera world:
 * player movement in world space (keys + pointer), an animated directional
 * sprite, a camera that follows, proximity interaction, dialogue running
 * with progress-event logging, and autosave including the quest snapshot.
 */
export abstract class BaseScene {
  protected readonly userId = "local-user";
  protected readonly dialogueRunner: DialogueRunner;
  protected readonly camera: Camera2D;

  private saveCooldown = 0;
  private playerSprite: AnimatedSprite | null = null;
  private facing: Direction = "down";

  constructor(protected readonly deps: SceneDeps) {
    this.dialogueRunner = new DialogueRunner(deps.dialogueUI, deps.dialogueManager, (dialogueId, choiceId) =>
      this.recordChoice(dialogueId, choiceId)
    );
    // Subclass `world` field initializers run after super(); the camera is
    // pointed at the real world bounds every frame in update().
    this.camera = new Camera2D({ width: 0, height: 0 });
  }

  /** Scene id used in GameState.currentScene and progress events. */
  abstract readonly sceneId: string;

  /** Human-readable scene name shown in the HUD. */
  abstract readonly displayName: string;

  /** World size in pixels — larger than the viewport; the camera follows. */
  abstract readonly world: WorldSize;

  /** Entities the player can interact with (recomputed each frame). */
  protected abstract interactables(): Interactable[];

  /** Draw world-space content (ground, landmarks, entities). Called inside the camera transform. */
  protected abstract drawScene(): void;

  /** Called when the player enters the scene (and on boot for the active scene). */
  enter(): void {}

  update(dt: number): void {
    const player = this.deps.gameState.player;
    const startX = player.x;
    const startY = player.y;

    const axis = this.deps.input.axis();
    player.x += axis.x * PLAYER_SPEED * dt;
    player.y += axis.y * PLAYER_SPEED * dt;

    const target = this.deps.input.pointerTarget;
    if (target) {
      // Pointer is in screen space; the world target adds the camera offset.
      const worldX = target.x + this.camera.x;
      const worldY = target.y + this.camera.y;
      const dx = worldX - player.x;
      const dy = worldY - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 5) {
        player.x += (dx / distance) * PLAYER_SPEED * dt;
        player.y += (dy / distance) * PLAYER_SPEED * dt;
      } else {
        this.deps.input.pointerTarget = null;
      }
    }

    player.x = clamp(player.x, EDGE_MARGIN, this.world.width - EDGE_MARGIN);
    player.y = clamp(player.y, PLAYER_HEIGHT, this.world.height - EDGE_MARGIN);

    this.updatePlayerSprite(player.x - startX, player.y - startY, dt);
    this.camera.setWorld(this.world);
    this.camera.follow(player.x, player.y, this.deps.renderer.viewportWidth, this.deps.renderer.viewportHeight);

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
    const renderer = this.deps.renderer;
    renderer.clear();
    renderer.withCamera(this.camera, () => this.drawScene());

    // The whole city re-colours with the neighbourhood's vitality.
    const vitality = neighbourhoodVitality(this.deps.gameState.resources);
    renderer.setColorFilter(cityFilter(cityState(vitality)));
    this.deps.resourceHud.update(this.deps.gameState.resources);
  }

  private updatePlayerSprite(dx: number, dy: number, dt: number): void {
    if (!this.playerSprite) {
      this.playerSprite = this.deps.sprites.createSprite(this.deps.gameState.currentCharacter);
    }
    const { name, direction } = movementAnimation(dx, dy, this.facing);
    this.facing = direction;
    if (this.playerSprite) {
      this.playerSprite.play(name);
      this.playerSprite.update(dt);
    }
  }

  protected playerEntity(): RenderableEntity {
    const player = this.deps.gameState.player;
    const sprite = this.playerSprite?.image();
    const fallback = this.deps.assets.getImage(`${this.deps.gameState.currentCharacter}:icon`);
    return {
      id: "player",
      label: this.deps.gameState.playerName || this.deps.gameState.currentCharacter,
      x: player.x,
      y: player.y,
      ...spriteSize(sprite ?? fallback),
      image: sprite ?? fallback,
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

  /** Save immediately (used by app-level actions like "Pass time"). */
  saveNow(): Promise<void> {
    return this.autosave();
  }

  protected async autosave(): Promise<void> {
    await this.deps.saveRepository.save(this.userId, this.deps.sessionId, {
      ...this.deps.gameState.snapshot(),
      quests: this.deps.questManager.snapshot()
    });
    this.deps.saveStatus.textContent = `Saved locally ${new Date().toLocaleTimeString()}`;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Render at a fixed height, preserving the frame's aspect ratio when known. */
function spriteSize(image: HTMLImageElement | undefined): { width: number; height: number } {
  if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
    return { width: (PLAYER_HEIGHT * image.naturalWidth) / image.naturalHeight, height: PLAYER_HEIGHT };
  }
  return { width: PLAYER_HEIGHT, height: PLAYER_HEIGHT };
}
