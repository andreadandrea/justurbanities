import type { Quest } from "../types/Quest";

export type SerializableGameState = {
  currentScene: string;
  currentCharacter: string;
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

export class GameState {
  currentScene = "community_center";
  currentCharacter = "maya";
  player = { x: 280, y: 440 };
  variables: Record<string, boolean | number | string> = {};
  resources = {
    trust: 0,
    care: 0,
    commons: 0,
    voice: 0,
    resilience: 0,
    fragmentationGlobal: 5
  };

  snapshot(): SerializableGameState {
    return {
      currentScene: this.currentScene,
      currentCharacter: this.currentCharacter,
      player: { ...this.player },
      variables: { ...this.variables },
      resources: { ...this.resources }
    };
  }

  restore(state: SerializableGameState): void {
    this.currentScene = state.currentScene;
    this.currentCharacter = state.currentCharacter;
    this.player = { ...state.player };
    this.variables = { ...state.variables };
    this.resources = { ...state.resources };
  }
}
