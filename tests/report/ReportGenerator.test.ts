import { describe, expect, it } from "vitest";
import { buildReport } from "../../src/game/report/ReportGenerator";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import type { QuestFile } from "../../src/types/Quest";
import type { LocalSession, ProgressEvent } from "../../src/storage/LocalDatabase";
import questsData from "../../src/data/quests.json";

const session: LocalSession = {
  id: "session-1",
  userId: "local-user",
  scenarioId: "vertical-slice-01",
  startedAt: "2026-06-12T10:00:00.000Z",
  updatedAt: "2026-06-12T10:30:00.000Z"
};

function makeEvent(type: string, createdAt: string, payload: Record<string, unknown> = {}): ProgressEvent {
  return { id: `e-${createdAt}`, sessionId: session.id, userId: "local-user", type, payload, createdAt, synced: 0 };
}

describe("buildReport (Task 7)", () => {
  it("aggregates session, resources, quests, events and observations", () => {
    const initial = { ...new GameState().resources };

    const state = new GameState();
    state.currentScene = "crossroads";
    state.resources.voice += 2;
    state.resources.care += 1;
    state.variables.notedEveningBusGap = true;

    const quests = new QuestManager();
    quests.load(questsData as unknown as QuestFile);
    quests.startQuest("P01");
    quests.completeObjective("P01", "talk_to_anna");
    quests.completeObjective("P01", "talk_to_ben");
    quests.startQuest("C01");

    const events = [
      makeEvent("dialogue_choice", "2026-06-12T10:05:00.000Z", { scene: "community_center" }),
      makeEvent("dialogue_choice", "2026-06-12T10:10:00.000Z", { scene: "community_center" }),
      makeEvent("dialogue_choice", "2026-06-12T10:20:00.000Z", { scene: "crossroads" }),
      makeEvent("report_generated", "2026-06-12T10:25:00.000Z")
    ];

    const report = buildReport({
      session,
      state: state.snapshot(),
      quests: quests.snapshot(),
      events,
      initialResources: initial
    });

    expect(report.reportVersion).toBe("1.0");
    expect(report.session.id).toBe("session-1");
    expect(report.player).toEqual({ character: "maya", lastScene: "crossroads" });

    // only actual deltas appear in changes
    expect(report.resources.changes).toEqual({ voice: 2, care: 1 });
    expect(report.resources.final.fragmentationGlobal).toBe(5);

    expect(report.quests.completed.map((q) => q.id)).toEqual(["P01"]);
    expect(report.quests.active.map((q) => q.id)).toEqual(["C01"]);
    expect(report.quests.notStarted).toEqual(["P02"]);
    expect(report.quests.completed[0].objectives.every((o) => o.completed)).toBe(true);

    expect(report.participation.totalEvents).toBe(4);
    expect(report.participation.dialogueChoices).toBe(3);
    expect(report.participation.choicesByScene).toEqual({ community_center: 2, crossroads: 1 });
    expect(report.participation.eventsByType.report_generated).toBe(1);
    expect(report.participation.firstEventAt).toBe("2026-06-12T10:05:00.000Z");
    expect(report.participation.lastEventAt).toBe("2026-06-12T10:25:00.000Z");

    expect(report.observations.notedEveningBusGap).toBe(true);
  });

  it("handles an empty session gracefully", () => {
    const initial = { ...new GameState().resources };
    const quests = new QuestManager();
    quests.load(questsData as unknown as QuestFile);

    const report = buildReport({
      session,
      state: new GameState().snapshot(),
      quests: quests.snapshot(),
      events: [],
      initialResources: initial
    });

    expect(report.resources.changes).toEqual({});
    expect(report.quests.completed).toEqual([]);
    expect(report.participation.totalEvents).toBe(0);
    expect(report.participation.firstEventAt).toBeNull();
    expect(report.observations).toEqual({});
  });
});
