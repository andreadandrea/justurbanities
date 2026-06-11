import type { Effect, Condition } from "../../types/Dialogue";
import type { GameState } from "../GameState";
import type { QuestManager } from "../quest/QuestManager";

export type ProgressEventHandler = (eventType: string, payload?: Record<string, unknown>) => void;

export class EffectResolver {
  private progressEventHandler?: ProgressEventHandler;

  constructor(
    private readonly gameState: GameState,
    private readonly questManager: QuestManager
  ) {}

  setProgressEventHandler(handler: ProgressEventHandler): void {
    this.progressEventHandler = handler;
  }

  check(condition: Condition): boolean {
    switch (condition.type) {
      case "variableEquals":
        return this.gameState.variables[condition.key] === condition.value;
      case "variableNotEquals":
        return this.gameState.variables[condition.key] !== condition.value;
      case "resourceAtLeast":
        return Number(this.gameState.resources[condition.key as keyof typeof this.gameState.resources] ?? 0) >= condition.value;
      case "resourceBelow":
        return Number(this.gameState.resources[condition.key as keyof typeof this.gameState.resources] ?? 0) < condition.value;
      case "questState":
        return this.questManager.getQuestStatus(condition.questId) === condition.state;
      default:
        return false;
    }
  }

  checkAll(conditions: Condition[] = []): boolean {
    return conditions.every((condition) => this.check(condition));
  }

  apply(effect: Effect): void {
    switch (effect.type) {
      case "setVariable":
        this.gameState.variables[effect.key] = effect.value;
        break;
      case "addResource": {
        const key = effect.key as keyof typeof this.gameState.resources;
        this.gameState.resources[key] = Number(this.gameState.resources[key] ?? 0) + effect.value;
        break;
      }
      case "startQuest":
        this.questManager.startQuest(effect.questId);
        break;
      case "completeObjective":
        this.questManager.completeObjective(effect.questId, effect.objectiveId);
        break;
      case "completeQuest":
        this.questManager.completeQuest(effect.questId);
        break;
      case "createProgressEvent":
        this.progressEventHandler?.(effect.eventType, effect.payload);
        break;
    }
  }

  applyAll(effects: Effect[] = []): void {
    for (const effect of effects) this.apply(effect);
  }
}
