import type { LocalSession, ProgressEvent } from "../../storage/LocalDatabase";
import type { SerializableGameState } from "../GameState";
import type { Quest } from "../../types/Quest";

export type EducationalReport = {
  reportVersion: "1.0";
  generatedAt: string;
  session: {
    id: string;
    scenarioId: string;
    startedAt: string;
    updatedAt: string;
  };
  player: {
    character: string;
    lastScene: string;
  };
  resources: {
    initial: Record<string, number>;
    final: Record<string, number>;
    /** final − initial, only keys that actually changed */
    changes: Record<string, number>;
  };
  quests: {
    completed: Array<{ id: string; title: string; objectives: Array<{ id: string; description: string; completed: boolean }> }>;
    active: Array<{ id: string; title: string; objectives: Array<{ id: string; description: string; completed: boolean }> }>;
    notStarted: string[];
  };
  participation: {
    totalEvents: number;
    dialogueChoices: number;
    choicesByScene: Record<string, number>;
    eventsByType: Record<string, number>;
    firstEventAt: string | null;
    lastEventAt: string | null;
  };
  /** Game variables: the civic notes and promises collected while playing. */
  observations: Record<string, boolean | number | string>;
};

export type ReportInput = {
  session: LocalSession;
  state: SerializableGameState;
  quests: Quest[];
  events: ProgressEvent[];
  initialResources: Record<string, number>;
};

function questSummary(quest: Quest) {
  return {
    id: quest.id,
    title: quest.title,
    objectives: quest.objectives.map((objective) => ({
      id: objective.id,
      description: objective.description,
      completed: objective.completed
    }))
  };
}

/** Pure function: same inputs, same report. All data is local (GDPR-friendly). */
export function buildReport(input: ReportInput): EducationalReport {
  const { session, state, quests, events, initialResources } = input;

  const finalResources: Record<string, number> = { ...state.resources };
  const changes: Record<string, number> = {};
  for (const key of new Set([...Object.keys(initialResources), ...Object.keys(finalResources)])) {
    const delta = (finalResources[key] ?? 0) - (initialResources[key] ?? 0);
    if (delta !== 0) changes[key] = delta;
  }

  const eventsByType: Record<string, number> = {};
  const choicesByScene: Record<string, number> = {};
  let dialogueChoices = 0;
  for (const event of events) {
    eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
    if (event.type === "dialogue_choice") {
      dialogueChoices += 1;
      const scene = typeof event.payload.scene === "string" ? event.payload.scene : "unknown";
      choicesByScene[scene] = (choicesByScene[scene] ?? 0) + 1;
    }
  }

  return {
    reportVersion: "1.0",
    generatedAt: new Date().toISOString(),
    session: {
      id: session.id,
      scenarioId: session.scenarioId,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt
    },
    player: {
      character: state.currentCharacter,
      lastScene: state.currentScene
    },
    resources: {
      initial: { ...initialResources },
      final: finalResources,
      changes
    },
    quests: {
      completed: quests.filter((quest) => quest.status === "completed").map(questSummary),
      active: quests.filter((quest) => quest.status === "active").map(questSummary),
      notStarted: quests
        .filter((quest) => quest.status === "locked" || quest.status === "available")
        .map((quest) => quest.id)
    },
    participation: {
      totalEvents: events.length,
      dialogueChoices,
      choicesByScene,
      eventsByType,
      firstEventAt: events[0]?.createdAt ?? null,
      lastEventAt: events[events.length - 1]?.createdAt ?? null
    },
    observations: { ...state.variables }
  };
}
