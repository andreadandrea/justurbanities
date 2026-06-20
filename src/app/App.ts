import { AssetLoader } from "../assets/AssetLoader";
import { PreloadManager, type AssetManifest } from "../assets/PreloadManager";
import assetManifest from "../data/asset_manifest.json";
import { GameLoop } from "../engine/GameLoop";
import { CanvasRenderer } from "../engine/CanvasRenderer";
import { InputManager } from "../engine/InputManager";
import { LocalDatabase } from "../storage/LocalDatabase";
import { SaveRepository } from "../storage/SaveRepository";
import { ProgressRepository } from "../storage/ProgressRepository";
import { SyncQueue } from "../sync/SyncQueue";
import { SyncEngine } from "../sync/SyncEngine";
import { createRemoteApi } from "../sync/RemoteApiClient";
import { CommunityCenterScene } from "../scenes/CommunityCenterScene";
import { CrossroadsScene } from "../scenes/CrossroadsScene";
import type { BaseScene, SceneDeps } from "../scenes/BaseScene";
import { DialogueUI } from "../ui/DialogueUI";
import { DebugPanel } from "../ui/DebugPanel";
import { OfflineControls } from "../ui/OfflineControls";
import { ReportButton } from "../ui/ReportButton";
import { OpeningScreens, type PlayableCharacter } from "../ui/OpeningScreens";
import { ResourceHud } from "../ui/ResourceHud";
import { OfflineAssetCache, collectAssetUrls, type AnimationsData } from "../assets/OfflineAssetCache";
import { SpriteRepository } from "../assets/SpriteRepository";
import { GameState } from "../game/GameState";
import { QuestManager } from "../game/quest/QuestManager";
import { EffectResolver } from "../game/effects/EffectResolver";
import { DialogueManager } from "../game/dialogue/DialogueManager";
import type { DialogueFile } from "../types/Dialogue";
import type { QuestFile } from "../types/Quest";
import {
  animationsSchema,
  assetManifestSchema,
  charactersSchema,
  dialogueFileSchema,
  questFileSchema,
  playableSchema,
  prologueSchema,
  crisisFileSchema,
  validateData
} from "../data/validation";
import dialoguesData from "../data/dialogues.json";
import questsData from "../data/quests.json";
import charactersData from "../data/characters.json";
import animationsData from "../data/animations.json";
import playableData from "../data/playable.json";
import prologueData from "../data/prologue.json";
import crisesData from "../data/crises.json";

type AppElements = {
  appRoot: HTMLElement;
  canvas: HTMLCanvasElement;
  loadingScreen: HTMLElement;
  loadingStatus: HTMLElement;
  loadingProgress: HTMLProgressElement;
  dialogueRoot: HTMLElement;
  saveStatus: HTMLElement;
};

export class App {
  private readonly renderer: CanvasRenderer;
  private readonly input: InputManager;
  private readonly db = new LocalDatabase();
  private readonly state = new GameState();
  private readonly assetLoader = new AssetLoader();
  private readonly preloadManager = new PreloadManager(this.assetLoader);
  private readonly dialogueUI: DialogueUI;
  private readonly saveRepository: SaveRepository;
  private readonly progressRepository: ProgressRepository;
  private readonly syncQueue: SyncQueue;
  private readonly syncEngine: SyncEngine;
  private readonly questManager = new QuestManager();
  private readonly effectResolver = new EffectResolver(this.state, this.questManager);
  private readonly dialogueManager = new DialogueManager(this.effectResolver);
  private scenes!: Record<string, BaseScene>;
  private loop!: GameLoop;

  constructor(private readonly elements: AppElements) {
    this.renderer = new CanvasRenderer(elements.canvas);
    this.input = new InputManager(elements.canvas);
    this.dialogueUI = new DialogueUI(elements.dialogueRoot);
    this.saveRepository = new SaveRepository(this.db);
    this.progressRepository = new ProgressRepository(this.db);
    this.syncQueue = new SyncQueue(this.db);
    // Fake remote backend for now; swap with createRemoteApi("rest", url) later.
    this.syncEngine = new SyncEngine(this.syncQueue, createRemoteApi("fake"));
  }

  async start(): Promise<void> {
    await this.registerServiceWorker();

    // Validate every bundled JSON before anything uses it; on failure the
    // preload never starts and the loading screen explains what is broken.
    let manifest: AssetManifest;
    let dialogueFile: DialogueFile;
    let questFile: QuestFile;
    try {
      manifest = validateData("asset_manifest.json", assetManifestSchema, assetManifest) as AssetManifest;
      validateData("characters.json", charactersSchema, charactersData);
      validateData("animations.json", animationsSchema, animationsData);
      dialogueFile = validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile;
      questFile = validateData("quests.json", questFileSchema, questsData) as QuestFile;
      validateData("playable.json", playableSchema, playableData);
      validateData("prologue.json", prologueSchema, prologueData);
      validateData("crises.json", crisisFileSchema, crisesData);
    } catch (error) {
      console.error(error);
      this.elements.loadingProgress.hidden = true;
      this.elements.loadingStatus.textContent =
        error instanceof Error ? error.message : "Game data failed validation.";
      return;
    }

    await this.db.openDatabase();
    await this.preload(manifest);

    this.questManager.load(questFile);
    this.dialogueManager.load(dialogueFile);

    const session = await this.saveRepository.loadOrCreateSession("local-user", "vertical-slice-01");
    const save = await this.saveRepository.loadLatestSave(session.id);
    const canContinue = !!save && save.state.started === true;

    // Opening flow: title → prologue → character selection → customization.
    this.elements.loadingScreen.hidden = true;
    const opening = new OpeningScreens({
      root: this.elements.appRoot,
      playable: playableData.playable as PlayableCharacter[],
      prologue: prologueData.panels,
      canContinue,
      baseUrl: import.meta.env.BASE_URL
    });
    const choice = await opening.run();

    if (choice.mode === "continue" && save) {
      this.state.restore(save.state);
      if (save.state.quests?.length) {
        this.questManager.restore(save.state.quests);
      }
    } else if (choice.mode === "new") {
      this.state.startNewGame(choice.character, choice.name, choice.pronoun);
      await this.saveRepository.save("local-user", session.id, {
        ...this.state.snapshot(),
        quests: this.questManager.snapshot()
      });
    }

    // Dialogue effects can emit progress events; log + queue them like scene events.
    this.effectResolver.setProgressEventHandler((eventType, payload) => {
      void (async () => {
        const event = await this.progressRepository.append(session.id, "local-user", eventType, payload ?? {});
        await this.syncQueue.enqueue("progress_event", event.id, "create", event);
      })();
    });

    // Load animated sprite frames for the player and the on-street NPCs.
    const sprites = new SpriteRepository(
      this.assetLoader,
      animationsData as AnimationsData,
      manifest,
      import.meta.env.BASE_URL
    );
    await Promise.all([sprites.load(this.state.currentCharacter), sprites.load("anna"), sprites.load("ben")]);

    const sceneDeps: SceneDeps = {
      renderer: this.renderer,
      input: this.input,
      assets: this.assetLoader,
      sprites,
      dialogueUI: this.dialogueUI,
      gameState: this.state,
      dialogueManager: this.dialogueManager,
      questManager: this.questManager,
      resourceHud: new ResourceHud(this.elements.appRoot),
      saveRepository: this.saveRepository,
      progressRepository: this.progressRepository,
      syncQueue: this.syncQueue,
      sessionId: session.id,
      saveStatus: this.elements.saveStatus,
      changeScene: (sceneId, spawn) => this.changeScene(sceneId, spawn)
    };

    this.scenes = {
      community_center: new CommunityCenterScene(sceneDeps),
      crossroads: new CrossroadsScene(sceneDeps)
    };
    if (!this.scenes[this.state.currentScene]) {
      this.state.currentScene = "community_center";
    }

    new DebugPanel({
      root: this.elements.appRoot,
      gameState: this.state,
      questManager: this.questManager,
      syncQueue: this.syncQueue,
      db: this.db,
      sessionId: session.id
    });

    new OfflineControls(
      this.elements.appRoot,
      new OfflineAssetCache(
        collectAssetUrls(manifest, animationsData as AnimationsData, import.meta.env.BASE_URL)
      )
    );

    new ReportButton({
      root: this.elements.appRoot,
      gameState: this.state,
      questManager: this.questManager,
      progressRepository: this.progressRepository,
      syncQueue: this.syncQueue,
      session,
      saveStatus: this.elements.saveStatus
    });

    this.loop = new GameLoop({
      update: (dt) => this.activeScene().update(dt),
      render: () => this.activeScene().render()
    });

    this.activeScene().enter();
    this.loop.start();
    this.syncEngine.start();
  }

  private activeScene(): BaseScene {
    return this.scenes[this.state.currentScene] ?? this.scenes.community_center;
  }

  private changeScene(sceneId: string, spawn: { x: number; y: number }): void {
    const scene = this.scenes[sceneId];
    if (!scene) {
      console.warn(`Unknown scene: ${sceneId}`);
      return;
    }
    this.state.currentScene = sceneId;
    this.state.player = { ...spawn };
    this.input.pointerTarget = null;
    this.dialogueUI.hide();
    scene.enter();
  }

  private async preload(manifest: AssetManifest): Promise<void> {
    // The manifest is bundled at build time: fetching /src/... only works in dev.
    await this.preloadManager.preloadFromData(manifest, (progress) => {
      this.elements.loadingProgress.value = progress.percent;
      this.elements.loadingStatus.textContent = progress.message;
    });
  }

  private async registerServiceWorker(): Promise<void> {
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`);
      } catch {
        console.warn("Service Worker registration failed.");
      }
    }
  }
}
