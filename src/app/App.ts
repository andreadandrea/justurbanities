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
import { CommunityCenterScene } from "../scenes/CommunityCenterScene";
import { DialogueUI } from "../ui/DialogueUI";
import { GameState } from "../game/GameState";

type AppElements = {
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
  private scene!: CommunityCenterScene;
  private loop!: GameLoop;

  constructor(private readonly elements: AppElements) {
    this.renderer = new CanvasRenderer(elements.canvas);
    this.input = new InputManager(elements.canvas);
    this.dialogueUI = new DialogueUI(elements.dialogueRoot);
    this.saveRepository = new SaveRepository(this.db);
    this.progressRepository = new ProgressRepository(this.db);
    this.syncQueue = new SyncQueue(this.db);
    this.syncEngine = new SyncEngine(this.syncQueue);
  }

  async start(): Promise<void> {
    await this.registerServiceWorker();
    await this.db.openDatabase();
    await this.preload();

    const session = await this.saveRepository.loadOrCreateSession("local-user", "vertical-slice-01");
    const save = await this.saveRepository.loadLatestSave(session.id);
    if (save) {
      this.state.restore(save.state);
    }

    this.scene = new CommunityCenterScene({
      renderer: this.renderer,
      input: this.input,
      assets: this.assetLoader,
      dialogueUI: this.dialogueUI,
      gameState: this.state,
      saveRepository: this.saveRepository,
      progressRepository: this.progressRepository,
      syncQueue: this.syncQueue,
      sessionId: session.id,
      saveStatus: this.elements.saveStatus
    });

    this.loop = new GameLoop({
      update: (dt) => this.scene.update(dt),
      render: () => this.scene.render()
    });

    this.elements.loadingScreen.hidden = true;
    this.loop.start();
    this.syncEngine.start();
  }

  private async preload(): Promise<void> {
    // The manifest is bundled at build time: fetching /src/... only works in dev.
    await this.preloadManager.preloadFromData(assetManifest as AssetManifest, (progress) => {
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
