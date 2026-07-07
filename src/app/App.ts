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
import { SupabaseRemoteApi } from "../sync/SupabaseRemoteApi";
import {
  chooseRemoteAdapter,
  facilitatorEnabled,
  mpEnabled,
  sessionCodeFromUrl,
  MP_SESSION_SETTING,
  type MpJoinInfo
} from "../game/mp/MpConfig";
import { MpJoinPanel } from "../ui/MpJoinPanel";
import { FacilitatorPanel } from "../ui/FacilitatorPanel";
import { MinigamePanel } from "../ui/MinigamePanel";
import { PlaytestInstrumentation } from "../game/playtest/PlaytestInstrumentation";
import type { MinigameDefinition } from "../game/minigame/AllocationMinigame";
import minigamesData from "../data/minigames.json";
import balancingData from "../data/balancing.json";
import { fetchSessionEvents } from "../sync/SupabaseRemoteApi";
import type { CityEvent } from "../game/mp/CityReducer";
import { CommunityCenterScene } from "../scenes/CommunityCenterScene";
import { CrossroadsScene } from "../scenes/CrossroadsScene";
import { DistrictScene, type DistrictConfig } from "../scenes/DistrictScene";
import districtsData from "../data/districts.json";
import type { BaseScene, SceneDeps } from "../scenes/BaseScene";
import { DialogueUI } from "../ui/DialogueUI";
import { DebugPanel } from "../ui/DebugPanel";
import { OfflineControls } from "../ui/OfflineControls";
import { ReportButton } from "../ui/ReportButton";
import { OpeningScreens, type PlayableCharacter } from "../ui/OpeningScreens";
import { ResourceHud } from "../ui/ResourceHud";
import { TimeHud } from "../ui/TimeHud";
import { GameClock } from "../game/time/GameClock";
import { CrisisManager } from "../game/crisis/CrisisManager";
import { PromiseManager } from "../game/promise/PromiseManager";
import type { PromiseFile } from "../game/promise/PromiseManager";
import { LogbookPanel } from "../ui/LogbookPanel";
import promisesData from "../data/promises.json";
import { CrisisWeek } from "../game/crisis/CrisisWeek";
import { AssemblyEngine, ASSEMBLY_READY_FLAG } from "../game/assembly/AssemblyEngine";
import { AssemblyPanel } from "../ui/AssemblyPanel";
import assemblyData from "../data/assembly.json";
import type { AssemblyFile } from "../types/Assembly";
import { computeEndingMetrics, resolveEnding, ENDING_VAR } from "../game/endings/EndingsEngine";
import endingsData from "../data/endings.json";
import type { EndingsFile } from "../types/Endings";
import { StoryDirector } from "../game/story/StoryDirector";
import { BarrierMap } from "../game/story/BarrierMap";
import { DialogueRunner } from "../game/dialogue/DialogueRunner";
import type { CrisisFile } from "../types/Crisis";
import { I18n, LOCALES, type LocaleCode } from "../i18n/I18n";
import { OptionsPanel } from "../ui/OptionsPanel";
import { SettingsRepository } from "../storage/SettingsRepository";
import enLocale from "../locales/en.json";
import itLocale from "../locales/it.json";
import deLocale from "../locales/de.json";
import huLocale from "../locales/hu.json";
import plLocale from "../locales/pl.json";
import svLocale from "../locales/sv.json";
import roLocale from "../locales/ro.json";
import { OfflineAssetCache, collectAssetUrls, packCacheName, type AnimationsData } from "../assets/OfflineAssetCache";
import { SpriteRepository } from "../assets/SpriteRepository";
import { CharacterArt } from "../assets/CharacterArt";
import type { ArtVariant } from "../assets/ArtStyle";
import { GameState } from "../game/GameState";
import { QuestManager } from "../game/quest/QuestManager";
import { EffectResolver } from "../game/effects/EffectResolver";
import { DialogueManager } from "../game/dialogue/DialogueManager";
import type { DialogueFile } from "../types/Dialogue";
import type { QuestFile } from "../types/Quest";
import {
  animationsSchema,
  assemblyFileSchema,
  assetManifestSchema,
  balancingFileSchema,
  endingsFileSchema,
  minigamesFileSchema,
  charactersSchema,
  dialogueFileSchema,
  questFileSchema,
  playableSchema,
  prologueSchema,
  crisisFileSchema,
  scheduleFileSchema,
  promiseFileSchema,
  districtFileSchema,
  validateData
} from "../data/validation";
import dialoguesData from "../data/dialogues.json";
import questsData from "../data/quests.json";
import charactersData from "../data/characters.json";
import animationsData from "../data/animations.json";
import playableData from "../data/playable.json";
import prologueData from "../data/prologue.json";
import crisesData from "../data/crises.json";
import scheduleData from "../data/schedule.json";
import { activePlacements } from "../game/npc/NpcSchedule";
import { districtVitality, questAnchors } from "../game/resources/DistrictVitality";
import type { ScheduleFile } from "../types/Schedule";

type AppElements = {
  appRoot: HTMLElement;
  canvas: HTMLCanvasElement;
  loadingScreen: HTMLElement;
  loadingStatus: HTMLElement;
  loadingProgress: HTMLProgressElement;
  dialogueRoot: HTMLElement;
  saveStatus: HTMLElement;
  sceneTitle: HTMLElement;
};

export class App {
  private readonly renderer: CanvasRenderer;
  private readonly input: InputManager;
  private readonly db = new LocalDatabase();
  private readonly state = new GameState();
  private readonly i18n = new I18n();
  private readonly assetLoader = new AssetLoader();
  private readonly preloadManager = new PreloadManager(this.assetLoader);
  private readonly dialogueUI: DialogueUI;
  private readonly saveRepository: SaveRepository;
  private readonly progressRepository: ProgressRepository;
  private readonly syncQueue: SyncQueue;
  /** Reassigned when MP-2 swaps in the real adapter (join-by-code). */
  private syncEngine: SyncEngine;
  private readonly questManager = new QuestManager();
  private readonly effectResolver = new EffectResolver(this.state, this.questManager);
  private readonly dialogueManager = new DialogueManager(this.effectResolver);
  private scenes!: Record<string, BaseScene>;
  private loop!: GameLoop;
  /** Set during start(); the Phase 5.2 options toggle calls this. */
  private applyArtStyle: ((variant: ArtVariant) => Promise<void>) | null = null;

  constructor(private readonly elements: AppElements) {
    this.renderer = new CanvasRenderer(elements.canvas);
    this.input = new InputManager(elements.canvas);
    const localeData = { en: enLocale, it: itLocale, de: deLocale, hu: huLocale, pl: plLocale, sv: svLocale, ro: roLocale };
    for (const locale of LOCALES) this.i18n.register(locale, localeData[locale]);

    this.dialogueUI = new DialogueUI(elements.dialogueRoot, this.i18n, () => ({
      playerName: this.state.playerName || this.state.currentCharacter,
      pronoun: this.state.playerPronoun
    }));
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
    let scheduleFile: ScheduleFile;
    let crisisFile: CrisisFile;
    let promiseFile: PromiseFile;
    let assemblyFile: AssemblyFile;
    let endingsFile: EndingsFile;
    let minigameDefs: Array<MinigameDefinition & { triggerVariable: string; doneVariable: string }>;
    try {
      manifest = validateData("asset_manifest.json", assetManifestSchema, assetManifest) as AssetManifest;
      validateData("characters.json", charactersSchema, charactersData);
      validateData("animations.json", animationsSchema, animationsData);
      dialogueFile = validateData("dialogues.json", dialogueFileSchema, dialoguesData) as DialogueFile;
      questFile = validateData("quests.json", questFileSchema, questsData) as QuestFile;
      validateData("playable.json", playableSchema, playableData);
      validateData("prologue.json", prologueSchema, prologueData);
      crisisFile = validateData("crises.json", crisisFileSchema, crisesData) as CrisisFile;
      scheduleFile = validateData("schedule.json", scheduleFileSchema, scheduleData) as ScheduleFile;
      promiseFile = validateData("promises.json", promiseFileSchema, promisesData) as PromiseFile;
      assemblyFile = validateData("assembly.json", assemblyFileSchema, assemblyData) as AssemblyFile;
      endingsFile = validateData("endings.json", endingsFileSchema, endingsData) as EndingsFile;
      minigameDefs = (
        validateData("minigames.json", minigamesFileSchema, minigamesData) as {
          minigames: Array<MinigameDefinition & { triggerVariable: string; doneVariable: string }>;
        }
      ).minigames;
      validateData("districts.json", districtFileSchema, districtsData);
      validateData("balancing.json", balancingFileSchema, balancingData);
    } catch (error) {
      console.error(error);
      this.elements.loadingProgress.hidden = true;
      this.elements.loadingStatus.textContent =
        error instanceof Error ? error.message : "Game data failed validation.";
      return;
    }

    await this.db.openDatabase();
    await this.preload(manifest);

    // i18n: restore the saved language before any UI shows.
    const i18n = this.i18n;
    const settings = new SettingsRepository(this.db);
    const savedLocale = await settings.get<LocaleCode>("locale");
    if (savedLocale && LOCALES.includes(savedLocale)) i18n.setLocale(savedLocale);

    this.questManager.load(questFile);
    this.dialogueManager.load(dialogueFile);

    const session = await this.saveRepository.loadOrCreateSession("local-user", "vertical-slice-01");
    const save = await this.saveRepository.loadLatestSave(session.id);
    const canContinue = !!save && save.state.started === true;

    // Opening flow: title → prologue → character selection → customization.
    this.elements.loadingScreen.hidden = true;
    const preferredArt = (await settings.get<ArtVariant>("artStyle")) ?? "realistic";
    const opening = new OpeningScreens({
      root: this.elements.appRoot,
      playable: playableData.playable as PlayableCharacter[],
      prologue: prologueData.panels,
      canContinue,
      baseUrl: import.meta.env.BASE_URL,
      i18n,
      artStyle: {
        initial: preferredArt,
        onChange: (variant) => void settings.set("artStyle", variant)
      }
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
    // Variant-aware character art (icons/portraits) + sprite frames.
    // The flat asset layout is the realistic set; animal loads lazily on switch.
    const art = new CharacterArt(this.assetLoader, manifest, import.meta.env.BASE_URL);
    const spriteIds = new Set<string>([
      this.state.currentCharacter,
      ...scheduleFile.placements.map((placement) => placement.npcId)
    ]);
    await Promise.all([...spriteIds].map((id) => sprites.load(id)));
    const applyArtStyle = async (variant: ArtVariant) => {
      // Frames first, so the swap notification finds the new variant ready.
      await Promise.all([...spriteIds].map((id) => sprites.load(id, variant)));
      await art.setVariant(variant);
    };
    this.applyArtStyle = applyArtStyle;

    // Continue: the save's art style wins. New game: device preference.
    if (choice.mode === "new") {
      const preferred = await settings.get<ArtVariant>("artStyle");
      if (preferred === "animal") this.state.artStyle = preferred;
    }
    if (this.state.artStyle !== "realistic") await applyArtStyle(this.state.artStyle);

    // Day/time cycle: time only moves through explicit actions ("Pass time"
    // now; story beats later). Created before the scenes so placements can
    // depend on the current part of day.
    const clock = new GameClock(this.state);

    // Mission 2 §4.2: the lived-barrier overlay. Ben's briefing arms it;
    // sync() seeds Samir's ch.1 photo as the first pin once armed.
    const barrierMap = new BarrierMap(this.state, this.effectResolver);

    const anchors = questAnchors(scheduleFile);
    const sceneDeps: SceneDeps = {
      renderer: this.renderer,
      input: this.input,
      assets: this.assetLoader,
      sprites,
      dialogueUI: this.dialogueUI,
      gameState: this.state,
      dialogueManager: this.dialogueManager,
      questManager: this.questManager,
      resourceHud: new ResourceHud(this.elements.appRoot, i18n),
      saveRepository: this.saveRepository,
      progressRepository: this.progressRepository,
      syncQueue: this.syncQueue,
      sessionId: session.id,
      saveStatus: this.elements.saveStatus,
      changeScene: (sceneId, spawn) => this.changeScene(sceneId, spawn),
      npcPlacements: (sceneId) =>
        activePlacements(scheduleFile, sceneId, clock.timePart, (conditions) =>
          this.effectResolver.checkAll(conditions)
        ),
      clock,
      i18n,
      art,
      barrierMap,
      checkConditions: (conditions) => this.effectResolver.checkAll(conditions),
      onDialogueEnded: () => {
        storyDirector.check();
        checkMinigames();
        barrierMap.sync();
      },
      sceneVitality: (sceneId) =>
        districtVitality(sceneId, this.state.resources, anchors, (questId) =>
          this.questManager.getQuestStatus(questId)
        )
    };

    this.scenes = {
      community_center: new CommunityCenterScene(sceneDeps),
      crossroads: new CrossroadsScene(sceneDeps)
    };
    for (const district of districtsData.districts as DistrictConfig[]) {
      this.scenes[district.id] = new DistrictScene(sceneDeps, district);
    }
    if (!this.scenes[this.state.currentScene]) {
      this.state.currentScene = "community_center";
    }

    // Crisis Week: manager + orchestrator over the clock. Crisis scenes run
    // through an app-level dialogue runner so they appear in any scene.
    const logProgress = (eventType: string, payload: Record<string, unknown>) => {
      void (async () => {
        const event = await this.progressRepository.append(session.id, "local-user", eventType, payload);
        await this.syncQueue.enqueue("progress_event", event.id, "create", event);
      })();
    };
    const crisisManager = new CrisisManager(this.state, this.effectResolver, logProgress);
    crisisManager.load(crisisFile);
    const crisisRunner = new DialogueRunner(
      this.dialogueUI,
      this.dialogueManager,
      async (dialogueId, choiceId) => {
        logProgress("dialogue_choice", { dialogueId, choiceId, scene: this.state.currentScene });
        await this.activeScene().saveNow();
      },
      (speakerId) => art.portrait(speakerId),
      (dialogueId) => storyDirector.check()
    );

    // Chapter-1 story flow: routes after the prologue, assembly after routes.
    const storyDirector = new StoryDirector(
      this.state,
      (dialogueId, speakerLabel) => crisisRunner.run(dialogueId, speakerLabel),
      () => this.dialogueUI.isOpen,
      (dialogueId) => this.dialogueManager.has(dialogueId)
    );
    const crisisWeek = new CrisisWeek(
      this.state,
      clock,
      crisisManager,
      (dialogueId, speakerLabel) => crisisRunner.run(dialogueId, speakerLabel),
      () => this.dialogueUI.isOpen
    );

    // Chapter 5 — the assembly (task 7.1). The engine lives on GameState
    // variables (the plan travels with the save); the panel drives it.
    // Until ch.4 closing content raises the flag itself, finishing Crisis
    // Week opens the assembly on the next clock tick.
    const assemblyEngine = new AssemblyEngine(
      this.state,
      (conditions) => this.effectResolver.checkAll(conditions),
      (effects) => this.effectResolver.applyAll(effects),
      logProgress
    );
    assemblyEngine.load(assemblyFile);
    clock.on(() => {
      if (crisisWeek.completed) this.state.variables[ASSEMBLY_READY_FLAG] = true;
    });
    const displayNames = new Map<string, string>(
      [
        ...(charactersData as Array<{ id: string; displayName: string }>),
        ...playableData.playable,
        ...(districtsData.districts as Array<{ id: string; displayName: string }>)
      ].map((entry) => [entry.id, entry.displayName])
    );
    new AssemblyPanel({
      root: this.elements.appRoot,
      engine: assemblyEngine,
      i18n,
      npcName: (id) => displayNames.get(id) ?? id,
      saveNow: () => void this.activeScene().saveNow(),
      // §9 — evaluated when the signed plan is on the table; the id lands
      // in the save (report v2 reads it) and the panel shows the epilogue.
      ending: () => {
        // Computed once (§7.8): playing on after the pact never rewrites it.
        const existing = this.state.variables[ENDING_VAR];
        if (typeof existing === "string") return existing;
        const metrics = computeEndingMetrics({
          state: this.state,
          questStatus: (questId) => this.questManager.getQuestStatus(questId),
          promiseIds: promiseFile.promises.map((promise) => promise.id),
          crisisResultVars: crisisFile.crises.map((crisis) => crisis.resultVariable)
        });
        const endingId = resolveEnding(endingsFile, metrics);
        this.state.variables[ENDING_VAR] = endingId;
        return endingId;
      }
    });

    // Playtest instrumentation (task 9.3, M-E protocol): node timings and
    // the per-day resource curve flow into progress_events like everything
    // else — the report, the class export and the sync queue carry them.
    const instrumentation = new PlaytestInstrumentation(logProgress);
    this.dialogueManager.setInstrumentation(instrumentation);
    clock.on((event) => {
      if (event.type === "dayEnded") instrumentation.dayEnded(event.day, { ...this.state.resources });
    });

    // Mini-games (task 9.1): dialogue effects raise the trigger variable;
    // the panel opens as soon as the conversation closes. Reusable module —
    // the pilot is Sigrid's Modular Repair (§5.2).
    const minigamePanel = new MinigamePanel({
      root: this.elements.appRoot,
      i18n,
      applyEffects: (effects) => this.effectResolver.applyAll(effects),
      logProgress,
      onFinished: (minigameId) => {
        const definition = minigameDefs.find((candidate) => candidate.id === minigameId);
        if (definition) this.state.variables[definition.doneVariable] = true;
        void this.activeScene().saveNow();
      }
    });
    const checkMinigames = () => {
      if (minigamePanel.isOpen || this.dialogueUI.isOpen) return;
      for (const definition of minigameDefs) {
        if (
          this.state.variables[definition.triggerVariable] === true &&
          this.state.variables[definition.doneVariable] !== true
        ) {
          minigamePanel.open(definition);
          return;
        }
      }
    };

    // Promises (ratified): dialogue effects make them, deadlines break them.
    const promiseManager = new PromiseManager(this.state, logProgress);
    promiseManager.load(promiseFile);
    clock.on(() => promiseManager.evaluate());
    promiseManager.evaluate();
    new LogbookPanel(this.elements.appRoot, promiseManager, i18n);

    // The time HUD lives at app level so every scene shows it; passing time
    // autosaves so the clock survives reloads.
    new TimeHud(this.elements.appRoot, clock, i18n, () => {
      clock.advance();
      void this.activeScene().saveNow();
    });

    // Accessibility (task 9.2): font scale + high contrast, per device.
    const applyFontScale = (scale: number) => {
      document.documentElement.style.setProperty("--font-scale", String(scale));
    };
    const applyHighContrast = (enabled: boolean) => {
      document.body.classList.toggle("high-contrast", enabled);
    };
    const savedFontScale = (await settings.get<number>("fontScale")) ?? 1;
    const savedContrast = (await settings.get<boolean>("highContrast")) ?? false;
    applyFontScale(savedFontScale);
    applyHighContrast(savedContrast);

    // Options (⚙): language + art style, both persisted per device; the
    // art style also lives in the save snapshot (a save remembers its skin).
    new OptionsPanel(
      this.elements.appRoot,
      i18n,
      (locale) => {
        void settings.set("locale", locale);
      },
      {
        current: this.state.artStyle,
        onChange: (variant) => {
          this.state.artStyle = variant;
          void settings.set("artStyle", variant);
          void this.applyArtStyle?.(variant).then(() => this.activeScene().saveNow());
        }
      },
      {
        fontScale: savedFontScale,
        onFontScale: (scale) => {
          applyFontScale(scale);
          void settings.set("fontScale", scale);
        },
        highContrast: savedContrast,
        onHighContrast: (enabled) => {
          applyHighContrast(enabled);
          void settings.set("highContrast", enabled);
        }
      }
    );

    new DebugPanel({
      root: this.elements.appRoot,
      gameState: this.state,
      questManager: this.questManager,
      syncQueue: this.syncQueue,
      db: this.db,
      sessionId: session.id,
      i18n,
      armCrisisWeek: () => crisisWeek.arm(),
      openAssembly: () => {
        this.state.variables[ASSEMBLY_READY_FLAG] = true;
      },
      // Task 9.3: raw playtest data for the M-E protocol spreadsheets.
      exportPlaytest: () => {
        void (async () => {
          const events = await this.progressRepository.listBySession(session.id);
          const blob = new Blob(
            [JSON.stringify({ sessionId: session.id, exportedAt: new Date().toISOString(), events }, null, 2)],
            { type: "application/json" }
          );
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `justurbanities-playtest-${session.id.slice(0, 8)}.json`;
          link.click();
          URL.revokeObjectURL(url);
        })();
      }
    });

    // One offline pack per art variant (the animal pack includes the
    // realistic fallbacks so a single-variant install works fully offline).
    new OfflineControls(
      this.elements.appRoot,
      (["realistic", "animal"] as const).map((variant) => ({
        variant,
        cache: new OfflineAssetCache(
          collectAssetUrls(manifest, animationsData as AnimationsData, import.meta.env.BASE_URL, variant),
          packCacheName(variant)
        )
      })),
      i18n
    );

    new ReportButton({
      root: this.elements.appRoot,
      gameState: this.state,
      questManager: this.questManager,
      progressRepository: this.progressRepository,
      syncQueue: this.syncQueue,
      session,
      saveStatus: this.elements.saveStatus,
      i18n,
      displayName: (id) => displayNames.get(id) ?? id
    });

    // MP-2 (feature-flagged ?mp=1): join-by-code UI + Supabase adapter.
    // With the flag off nothing here runs — single player stays offline
    // with the in-memory fake adapter (zero network calls).
    if (mpEnabled(window.location.search)) {
      const mpEnv = {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
      };
      const applyMpAdapter = (info: MpJoinInfo | undefined, boot: boolean) => {
        const choice = chooseRemoteAdapter(window.location.search, info, mpEnv);
        if (choice.kind !== "supabase") return;
        this.syncEngine.stop();
        this.syncEngine = new SyncEngine(this.syncQueue, new SupabaseRemoteApi(choice.config));
        if (boot) this.syncEngine.start();
      };
      const joined = await settings.get<MpJoinInfo>(MP_SESSION_SETTING);
      new MpJoinPanel({
        root: this.elements.appRoot,
        i18n,
        joined,
        character: () => this.state.currentCharacter,
        onJoin: (info) => {
          void settings.set(MP_SESSION_SETTING, info);
          applyMpAdapter(info, true);
        }
      });
      applyMpAdapter(joined, false); // the final start() boots whichever engine is current
    }

    // MP-4 (?facilitator=1): read-only dashboard + class report export.
    // With Supabase configured it reads the remote session log (the code
    // comes from ?session=CODE or the joined session); otherwise it folds
    // the LOCAL event log — which also covers pass-and-play on one device.
    if (facilitatorEnabled(window.location.search)) {
      const joined = await settings.get<MpJoinInfo>(MP_SESSION_SETTING);
      const facilitatorCode = sessionCodeFromUrl(window.location.search) ?? joined?.code ?? "LOCAL";
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
      const loadEvents = async (): Promise<CityEvent[]> => {
        if (supabaseUrl && supabaseAnonKey && facilitatorCode !== "LOCAL") {
          return fetchSessionEvents({ url: supabaseUrl, anonKey: supabaseAnonKey, sessionCode: facilitatorCode });
        }
        const local = await this.progressRepository.listBySession(session.id);
        return local.map((event) => ({
          id: event.id,
          userId: event.userId,
          type: event.type,
          payload: event.payload,
          createdAt: event.createdAt
        }));
      };
      new FacilitatorPanel({
        root: this.elements.appRoot,
        i18n,
        sessionCode: () => facilitatorCode,
        loadEvents,
        playerName: (playerId) =>
          joined && joined.playerId === playerId ? joined.displayName : displayNames.get(playerId) ?? playerId
      });
    }

    this.loop = new GameLoop({
      update: (dt) => this.activeScene().update(dt),
      render: () => this.activeScene().render()
    });

    this.elements.saveStatus.textContent = i18n.t("ui.save.ready");

    const bootScene = this.activeScene();
    bootScene.enter();
    storyDirector.check();
    checkMinigames(); // resume a Saturday saved mid-trigger
    barrierMap.sync(); // resume a save armed before the fence photo seeded
    this.elements.sceneTitle.textContent = bootScene.displayName;
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
    this.elements.sceneTitle.textContent = scene.displayName;
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
