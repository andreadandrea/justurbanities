import type { Quest } from "../types/Quest";

export type Pronoun = "she" | "he" | "they";

export type SerializableGameState = {
  currentScene: string;
  currentCharacter: string;
  playerName: string;
  playerPronoun: Pronoun;
  /** false until the player has finished the opening flow at least once. */
  started: boolean;
  /** Day/time cycle (timePart: 0=morning, 1=afternoon, 2=evening). */
  day: number;
  timePart: number;
  player: { x: number; y: number };
  // Quest snapshot is attached at save time by the scene (QuestManager owns runtime state).
  quests?: Quest[];
  variables: Record<string, boolean | number | string>;
  resources: {
    trust: number;
    care: number;
    commons: number;
    voice: number;
    resilience: number;
    fragmentationGlobal: number;
  };
};

function freshResources() {
  return { trust: 0, care: 0, commons: 0, voice: 0, resilience: 0, fragmentationGlobal: 5 };
}

export class GameState {
  currentScene = "community_center";
  currentCharacter = "maya";
  playerName = "";
  playerPronoun: Pronoun = "they";
  started = false;
  day = 1;
  timePart = 0;
  player = { x: 280, y: 440 };
  variables: Record<string, boolean | number | string> = {};
  resources = freshResources();

  /** Reset to a clean run and apply the opening-flow choices. */
  startNewGame(character: string, name: string, pronoun: Pronoun): void {
    this.currentScene = "community_center";
    this.currentCharacter = character;
    this.playerName = name;
    this.playerPronoun = pronoun;
    this.started = true;
    this.day = 1;
    this.timePart = 0;
    this.player = { x: 280, y: 440 };
    this.variables = {};
    this.resources = freshResources();
  }

  snapshot(): SerializableGameState {
    return {
      currentScene: this.currentScene,
      currentCharacter: this.currentCharacter,
      playerName: this.playerName,
      playerPronoun: this.playerPronoun,
      started: this.started,
      day: this.day,
      timePart: this.timePart,
      player: { ...this.player },
      variables: { ...this.variables },
      resources: { ...this.resources }
    };
  }

  restore(state: SerializableGameState): void {
    this.currentScene = state.currentScene;
    this.currentCharacter = state.currentCharacter;
    // Defaults keep older saves (written before the opening flow) loadable.
    this.playerName = state.playerName ?? "";
    this.playerPronoun = state.playerPronoun ?? "they";
    this.started = state.started ?? true;
    this.day = state.day ?? 1;
    this.timePart = state.timePart ?? 0;
    this.player = { ...state.player };
    this.variables = { ...state.variables };
    this.resources = { ...state.resources };
  }
}
