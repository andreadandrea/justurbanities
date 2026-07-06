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
import { cityFilter, cityState } from "../game/resources/ResourceManager";
import type { NpcPlacement } from "../types/Schedule";
import { NpcDirector } from "../game/npc/NpcDirector";
import type { GameClock } from "../game/time/GameClock";
import type { CharacterArt } from "../assets/CharacterArt";
import type { I18n } from "../i18n/I18n";
import charactersData from "../data/characters.json";

const DISPLAY_NAMES = new Map(
  (charactersData as Array<{ id: string; displayName: string }>).map((character) => [
    character.id,
    character.displayName
  ])
);

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
  /** District-level vitality for a scene (global fabric + local repairs). */
  sceneVitality: (sceneId: string) => number;
  /** Active NPC placements for a scene, given current time and conditions. */
  npcPlacements: (sceneId: string) => NpcPlacement[];
  clock: GameClock;
  i18n: I18n;
  art: CharacterArt;
  /** App-level story director check, fired when any dialogue ends. */
  onDialogueEnded?: (dialogueId: string) => void;
};

/** Axis-aligned rectangle blocking player movement (fences, closures). */
export type Blocker = { x: number; y: number; width: number; height: number };

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
  protected readonly npcDirector: NpcDirector<AnimatedSprite>;

  private saveCooldown = 0;
  private playerSprite: AnimatedSprite | null = null;
  private facing: Direction = "down";

  constructor(protected readonly deps: SceneDeps) {
    this.dialogueRunner = new DialogueRunner(
      deps.dialogueUI,
      deps.dialogueManager,
      (dialogueId, choiceId) => this.recordChoice(dialogueId, choiceId),
      (speakerId) => deps.art.portrait(speakerId),
      (dialogueId) => deps.onDialogueEnded?.(dialogueId)
    );
    // Subclass `world` field initializers run after super(); the camera is
    // pointed at the real world bounds every frame in update().
    this.camera = new Camera2D({ width: 0, height: 0 });

    // Data-driven NPCs: the director re-materializes the roster whenever
    // time passes; story-state changes are picked up after every choice.
    this.npcDirector = new NpcDirector<AnimatedSprite>({
      placements: deps.npcPlacements,
      createSprite: (npcId) => deps.sprites.createSprite(npcId, deps.art.variant)
    });
    deps.clock.on(() => this.npcDirector.refresh());
    // Art-style switch: throw away variant-bound sprites; the director and
    // player rebuild them from the new variant's frames (instant swap).
    deps.art.onChange(() => {
      this.playerSprite = null;
      this.npcDirector.rebuildSprites();
    });
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

  /** Rectangles the player cannot enter (the barrier is experienced, not narrated). */
  protected blockers(): Blocker[] {
    return [];
  }

  /** Called when movement into a blocker was denied this frame. */
  protected onBlocked(_blocker: Blocker): void {}

  /** Called when the player enters the scene (and on boot for the active scene). */
  enter(): void {
    this.npcDirector.setScene(this.sceneId);
  }

  /** Scheduled NPCs as renderable entities (world space). */
  protected npcEntities(): RenderableEntity[] {
    return this.npcDirector.list().map((npc) => this.npcEntity(npc));
  }

  /** Scheduled NPCs as interactables opening their scheduled dialogue. */
  protected npcInteractables(): Interactable[] {
    return this.npcDirector.list().map((npc) => ({
      entity: this.npcEntity(npc),
      onInteract: () => this.dialogueRunner.run(npc.dialogueId, DISPLAY_NAMES.get(npc.id) ?? npc.id)
    }));
  }

  private npcEntity(npc: { id: string; x: number; y: number; sprite: AnimatedSprite | null }): RenderableEntity {
    const image = npc.sprite?.image() ?? this.deps.art.icon(npc.id);
    return {
      id: npc.id,
      label: DISPLAY_NAMES.get(npc.id) ?? npc.id,
      x: npc.x,
      y: npc.y,
      width: 132,
      height: 150,
      image,
      interactive: true
    };
  }

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

    // Physical barriers: deny the step, then let the scene react (Samir's
    // fence beat: you SLAM into it — the block is felt through the input).
    for (const blocker of this.blockers()) {
      if (
        player.x > blocker.x &&
        player.x < blocker.x + blocker.width &&
        player.y > blocker.y &&
        player.y < blocker.y + blocker.height
      ) {
        player.x = startX;
        player.y = startY;
        this.deps.input.pointerTarget = null;
        this.onBlocked(blocker);
        break;
      }
    }

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

    // The city re-colours with vitality — per district: local repairs
    // bring the colour back HERE first (§5.8, GAMEPLAY_LOOP pillar 1).
    const vitality = this.deps.sceneVitality(this.sceneId);
    renderer.setColorFilter(cityFilter(cityState(vitality)));
    this.deps.resourceHud.update(this.deps.gameState.resources);
  }

  private updatePlayerSprite(dx: number, dy: number, dt: number): void {
    if (!this.playerSprite) {
      this.playerSprite = this.deps.sprites.createSprite(this.deps.gameState.currentCharacter, this.deps.art.variant);
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
    const fallback = this.deps.art.icon(this.deps.gameState.currentCharacter);
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
    // Choices change quests/variables, so the NPC roster may change too.
    this.npcDirector.refresh();

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
    this.deps.saveStatus.textContent = `${this.deps.i18n.t("ui.save.saved")} ${new Date().toLocaleTimeString()}`;
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
