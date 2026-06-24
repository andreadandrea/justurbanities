import type { AssetLoader } from "../assets/AssetLoader";
import type { CanvasRenderer, WorldSize } from "../engine/CanvasRenderer";
import type { InputManager } from "../engine/InputManager";
import type { RenderableEntity } from "../types/Entity";
import type { DialogueUI } from "../ui/DialogueUI";
import type { GameState } from "../game/GameState";
import type { DialogueManager } from "../game/dialogue/DialogueManager";
import { DialogueRunner } from "../game/dialogue/DialogueRunner";
import type { QuestManager } from "../game/quest/QuestManager";
import type { EffectResolver } from "../game/effects/EffectResolver";
import type { GameClock } from "../game/time/GameClock";
import type { NpcDirector } from "../game/npc/NpcDirector";
import type { SaveRepository } from "../storage/SaveRepository";
import type { ProgressRepository } from "../storage/ProgressRepository";
import type { SyncQueue } from "../sync/SyncQueue";
import type { ResourceHud } from "../ui/ResourceHud";
import type { InteractionPrompt } from "../ui/InteractionPrompt";
import type { SpriteRepository } from "../assets/SpriteRepository";
import { Camera2D } from "../engine/Camera2D";
import { AnimatedSprite, movementAnimation, type Direction } from "../engine/AnimatedSprite";
import { stepMovement } from "../game/movement/MovementSystem";
import { findActiveInteractable, type Proximable } from "../game/interaction/ProximitySystem";
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
  effectResolver: EffectResolver;
  gameClock: GameClock;
  npcDirector: NpcDirector;
  resourceHud: ResourceHud;
  interactionPrompt: InteractionPrompt;
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

const PLAYER_SPEED = 220;
const AUTOSAVE_INTERVAL = 2;
const PLAYER_HEIGHT = 150;
const EDGE_MARGIN = 40;
const PROMPT_OFFSET_Y = 24;

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
    this.dialogueRunner = new DialogueRunner(
      deps.dialogueUI,
      deps.dialogueManager,
      (dialogueId, choiceId) => this.recordChoice(dialogueId, choiceId),
      () => ({ name: deps.gameState.playerName, pronoun: deps.gameState.playerPronoun })
    );
    // Subclass `world` field initializers run after super(); the camera is
    // pointed at the real world bounds every frame in update().
    this.camera = new Camera2D({ width: 0, height: 0 });
    // The world changes when time advances: refresh whichever scene is active.
    deps.gameClock.onChange(() => {
      if (this.deps.gameState.currentScene === this.sceneId) this.onTimeChanged();
    });
  }

  /** Scene id used in GameState.currentScene and progress events. */
  abstract readonly sceneId: string;

  /** World size in pixels — larger than the viewport; the camera follows. */
  abstract readonly world: WorldSize;

  /** Entities the player can interact with (recomputed each frame). */
  protected abstract interactables(): Interactable[];

  /** Draw world-space content (ground, landmarks, entities). Called inside the camera transform. */
  protected abstract drawScene(): void;

  /** Called when the player enters the scene (and on boot for the active scene). */
  enter(): void {}

  /** Called when the day/time cycle advances while this scene is active. */
  protected onTimeChanged(): void {}

  update(dt: number): void {
    const player = this.deps.gameState.player;
    const startX = player.x;
    const startY = player.y;

    // §6.4: while a dialogue is open the player can't walk away mid-line.
    // Freeze movement, drop any queued pointer target, and don't start a new
    // interaction. The prompt is hidden too (only shows when none is open).
    const dialogueOpen = this.deps.dialogueUI.isOpen();
    if (dialogueOpen) {
      this.deps.input.pointerTarget = null;
      this.deps.input.consumeInteract();
    } else {
      // Pointer is in screen space; the world target adds the camera offset.
      const screenTarget = this.deps.input.pointerTarget;
      const worldTarget = screenTarget
        ? { x: screenTarget.x + this.camera.x, y: screenTarget.y + this.camera.y }
        : null;

      const result = stepMovement({
        position: { x: player.x, y: player.y },
        axis: this.deps.input.axis(),
        pointerTarget: worldTarget,
        dt,
        speed: PLAYER_SPEED,
        bounds: this.world,
        margins: { edge: EDGE_MARGIN, top: PLAYER_HEIGHT },
        facing: this.facing
      });

      player.x = result.position.x;
      player.y = result.position.y;
      if (result.pointerArrived) this.deps.input.pointerTarget = null;
    }

    this.updatePlayerSprite(player.x - startX, player.y - startY, dt);
    this.camera.setWorld(this.world);
    this.camera.follow(player.x, player.y, this.deps.renderer.viewportWidth, this.deps.renderer.viewportHeight);

    const active = dialogueOpen ? undefined : this.findNearbyInteractable();
    this.updatePrompt(active, dialogueOpen);

    if (!dialogueOpen && this.deps.input.consumeInteract()) {
      if (active) active.onInteract();
    }

    this.saveCooldown -= dt;
    if (this.saveCooldown <= 0) {
      this.saveCooldown = AUTOSAVE_INTERVAL;
      void this.autosave();
    }
  }

  /**
   * §6.2 prompt overlay. Show "Press E / Tap to talk" near the active
   * interactable (world → screen via the camera) only when one exists and no
   * dialogue is open; tapping it fires the same handler as the interact key.
   */
  private updatePrompt(active: Interactable | undefined, dialogueOpen: boolean): void {
    if (!active || dialogueOpen) {
      this.deps.interactionPrompt.hide();
      return;
    }
    const screenX = active.entity.x - this.camera.x;
    const screenY = active.entity.y - this.camera.y - PROMPT_OFFSET_Y;
    this.deps.interactionPrompt.show(screenX, screenY, () => active.onInteract());
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

  /**
   * Nearest interactable within its own radius (§6.1). Each Interactable is
   * adapted to a Proximable using its entity position and optional per-entity
   * `interactionRadius`; ProximitySystem falls back to the shared default.
   */
  private findNearbyInteractable(): Interactable | undefined {
    const candidates = this.interactables().map((interactable) => ({
      interactable,
      x: interactable.entity.x,
      y: interactable.entity.y,
      interactionRadius: interactable.entity.interactionRadius
    } satisfies Proximable & { interactable: Interactable }));
    return findActiveInteractable(this.deps.gameState.player, candidates)?.interactable;
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

/** Render at a fixed height, preserving the frame's aspect ratio when known. */
function spriteSize(image: HTMLImageElement | undefined): { width: number; height: number } {
  if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
    return { width: (PLAYER_HEIGHT * image.naturalWidth) / image.naturalHeight, height: PLAYER_HEIGHT };
  }
  return { width: PLAYER_HEIGHT, height: PLAYER_HEIGHT };
}
