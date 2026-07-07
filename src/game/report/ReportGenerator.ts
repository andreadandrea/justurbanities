import type { LocalSession, ProgressEvent } from "../../storage/LocalDatabase";
import type { SerializableGameState } from "../GameState";
import type { Quest } from "../../types/Quest";

/** One entry of the three debrief lists — ids, not prose: the UI localizes. */
export type ReportListEntry = {
  kind:
    | "attendee"
    | "empty_chair"
    | "crisis"
    | "promise_kept"
    | "promise_broken"
    | "measure"
    | "district"
    | "conflict"
    | "conflict_evaded"
    | "missed_slot"
    | "empathy_map";
  id: string;
  detail?: string;
};

/** Debrief cards from the Learning-Outcomes alignment (Guida 06 §3). */
export type DebriefCard = {
  id: "empathic_knowledge" | "reality_policy_bridge" | "institutions_vs_participation";
  evidence: Record<string, number | string | boolean>;
};

export type EducationalReport = {
  reportVersion: "2.0";
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
  /** The three debrief lists (FPS §23), fed by progress_events. */
  lists: {
    whoArrived: ReportListEntry[];
    whatChanged: ReportListEntry[];
    whatWasMissed: ReportListEntry[];
  };
  /** Post-session debrief cards with the evidence that grounds each label. */
  debrief: DebriefCard[];
  /** §9 ending id, when the assembly signed the pact (undefined before). */
  ending?: string;
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

/**
 * The three debrief lists (Guida 06 §4 / FPS §23): who arrived, what
 * changed, what was missed — every entry traces back to a progress event,
 * so the report always reflects the actual playthrough.
 */
function buildLists(events: ProgressEvent[], variables: Record<string, boolean | number | string>) {
  const whoArrived: ReportListEntry[] = [];
  const whatChanged: ReportListEntry[] = [];
  const whatWasMissed: ReportListEntry[] = [];

  // The assembly room is the authoritative attendance shot (§7.2); the
  // LAST assembly_room event wins if the scene somehow ran twice.
  const room = [...events].reverse().find((event) => event.type === "assembly_room");
  if (room) {
    for (const npcId of (room.payload.present as string[]) ?? []) {
      whoArrived.push({ kind: "attendee", id: npcId });
    }
    for (const npcId of (room.payload.absent as string[]) ?? []) {
      whatWasMissed.push({ kind: "empty_chair", id: npcId });
    }
  }

  for (const event of events) {
    switch (event.type) {
      case "empathy_map":
        whatChanged.push({
          kind: "empathy_map",
          id: String(event.payload.who ?? ""),
          detail: String(event.payload.posture ?? "")
        });
        break;
      case "district_discovered":
        whatChanged.push({ kind: "district", id: String(event.payload.district ?? "") });
        break;
      case "crisis_resolved":
        whatChanged.push({
          kind: "crisis",
          id: String(event.payload.crisisId ?? ""),
          detail: String(event.payload.tier ?? "")
        });
        break;
      case "promise_kept":
        whatChanged.push({ kind: "promise_kept", id: String(event.payload.promiseId ?? "") });
        break;
      case "promise_broken":
        whatWasMissed.push({ kind: "promise_broken", id: String(event.payload.promiseId ?? "") });
        break;
      case "assembly_conflict": {
        const entry = {
          id: String(event.payload.conflictId ?? ""),
          detail: String(event.payload.positionId ?? "")
        };
        if (event.payload.kind === "evasion") whatWasMissed.push({ kind: "conflict_evaded", ...entry });
        else whatChanged.push({ kind: "conflict", ...entry });
        break;
      }
      case "assembly_plan": {
        for (const measure of (event.payload.measures as Array<Record<string, unknown>>) ?? []) {
          whatChanged.push({
            kind: "measure",
            id: String(measure.measureId ?? ""),
            detail: String(measure.owner ?? "")
          });
        }
        for (const slot of (event.payload.missedSlots as string[]) ?? []) {
          whatWasMissed.push({ kind: "missed_slot", id: slot });
        }
        break;
      }
    }
  }

  // Broken promises also live in variables (a deadline can expire after the
  // logger existed but before an event was written in older saves).
  for (const [key, value] of Object.entries(variables)) {
    if (
      value === "broken" &&
      key.startsWith("promise") &&
      !whatWasMissed.some((entry) => entry.kind === "promise_broken" && entry.id === key)
    ) {
      whatWasMissed.push({ kind: "promise_broken", id: key });
    }
  }

  return { whoArrived, whatChanged, whatWasMissed };
}

/** Debrief cards (Guida 06 §3): each label with the evidence behind it. */
function buildDebrief(
  events: ProgressEvent[],
  variables: Record<string, boolean | number | string>,
  resources: Record<string, number>
): DebriefCard[] {
  const count = (type: string) => events.filter((event) => event.type === type).length;
  return [
    {
      id: "empathic_knowledge",
      evidence: {
        empathyMaps: count("empathy_map"),
        knowledgeTableHeld: variables.knowledge_table_held === true,
        storiesInAssembly: count("assembly_room") > 0
      }
    },
    {
      id: "reality_policy_bridge",
      evidence: {
        commissionStarted: variables.commission_started === true,
        realMandate: variables.assemblyMandateReal === true,
        planCoverage: Number(variables.assemblyCoverage ?? 0),
        overpromise: variables.overpromise === true
      }
    },
    {
      id: "institutions_vs_participation",
      evidence: {
        trust: resources.trust ?? 0,
        voice: resources.voice ?? 0,
        conflictsEvaded: Number(variables.assemblyEvasions ?? 0),
        absentGroups: Number(variables.assemblyAbsentGroups ?? 0)
      }
    }
  ];
}

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
    reportVersion: "2.0",
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
    lists: buildLists(events, state.variables),
    debrief: buildDebrief(events, state.variables, finalResources),
    ending: typeof state.variables.endingId === "string" ? state.variables.endingId : undefined,
    observations: { ...state.variables }
  };
}
