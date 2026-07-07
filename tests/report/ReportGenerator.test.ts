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

    expect(report.reportVersion).toBe("2.0");
    expect(report.session.id).toBe("session-1");
    expect(report.player).toEqual({ character: "maya", lastScene: "crossroads" });

    // only actual deltas appear in changes
    expect(report.resources.changes).toEqual({ voice: 2, care: 1 });
    expect(report.resources.final.fragmentationGlobal).toBe(5);

    expect(report.quests.completed.map((q) => q.id)).toEqual(["P01"]);
    expect(report.quests.active.map((q) => q.id)).toEqual(["C01"]);
    expect(report.quests.notStarted).toContain("P02");
    expect(report.quests.notStarted).not.toContain("P01");
    expect(report.quests.notStarted).not.toContain("C01");
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
    expect(report.lists).toEqual({ whoArrived: [], whatChanged: [], whatWasMissed: [] });
    expect(report.ending).toBeUndefined();
    expect(report.debrief.map((card) => card.id)).toEqual([
      "empathic_knowledge",
      "reality_policy_bridge",
      "institutions_vs_participation"
    ]);
  });
});

describe("buildReport v2 — the three debrief lists (task 7.3)", () => {
  /** A full playthrough in miniature: interviews, crisis week, assembly. */
  function fullPlaythrough() {
    const state = new GameState();
    Object.assign(state.resources, { trust: 6, care: 5, commons: 5, voice: 4, resilience: 3 });
    Object.assign(state.variables, {
      knowledge_table_held: true,
      commission_started: true,
      assemblyMandateReal: true,
      assemblyCoverage: 4,
      assemblyAbsentGroups: 1,
      assemblyEvasions: 1,
      overpromise: false,
      endingId: "fragile_progress",
      promiseRepairDay: "broken"
    });

    const quests = new QuestManager();
    quests.load(questsData as unknown as QuestFile);

    const events = [
      makeEvent("empathy_map", "2026-06-12T10:01:00.000Z", { who: "viveca", posture: "silence" }),
      makeEvent("district_discovered", "2026-06-12T10:02:00.000Z", { district: "old_blocks" }),
      makeEvent("crisis_resolved", "2026-06-12T10:03:00.000Z", { crisisId: "CRISIS_HEATWAVE", tier: "transformative" }),
      makeEvent("promise_kept", "2026-06-12T10:04:00.000Z", { promiseId: "promiseSaferCrossing", owner: "ben" }),
      makeEvent("promise_broken", "2026-06-12T10:05:00.000Z", { promiseId: "promiseRepairDay", owner: "sigrid" }),
      makeEvent("assembly_room", "2026-06-12T10:06:00.000Z", {
        present: ["anna", "alexandria", "ben"],
        absent: ["tom", "gwen"]
      }),
      makeEvent("assembly_conflict", "2026-06-12T10:07:00.000Z", {
        conflictId: "urgency_vs_procedure",
        positionId: "synthesis",
        kind: "synthesis"
      }),
      makeEvent("assembly_conflict", "2026-06-12T10:08:00.000Z", {
        conflictId: "center_vs_network",
        positionId: "evade",
        kind: "evasion"
      }),
      makeEvent("assembly_plan", "2026-06-12T10:09:00.000Z", {
        coverage: 4,
        missedSlots: ["story", "invite"],
        measures: [{ measureId: "m_open_courtyards", owner: "anna", deadlineDay: 21, verification: "public_review" }]
      })
    ];

    return buildReport({
      session,
      state: state.snapshot(),
      quests: quests.snapshot(),
      events,
      initialResources: { ...new GameState().resources }
    });
  }

  it("who arrived: the assembly room shot, empty chairs on the missed list", () => {
    const report = fullPlaythrough();
    expect(report.lists.whoArrived.map((entry) => entry.id)).toEqual(["anna", "alexandria", "ben"]);
    expect(report.lists.whatWasMissed).toContainEqual({ kind: "empty_chair", id: "tom" });
    expect(report.lists.whatWasMissed).toContainEqual({ kind: "empty_chair", id: "gwen" });
  });

  it("what changed: empathy maps, districts, crises, kept promises, synthesis, measures", () => {
    const report = fullPlaythrough();
    const changed = report.lists.whatChanged;
    expect(changed).toContainEqual({ kind: "empathy_map", id: "viveca", detail: "silence" });
    expect(changed).toContainEqual({ kind: "district", id: "old_blocks" });
    expect(changed).toContainEqual({ kind: "crisis", id: "CRISIS_HEATWAVE", detail: "transformative" });
    expect(changed).toContainEqual({ kind: "promise_kept", id: "promiseSaferCrossing" });
    expect(changed).toContainEqual({ kind: "conflict", id: "urgency_vs_procedure", detail: "synthesis" });
    expect(changed).toContainEqual({ kind: "measure", id: "m_open_courtyards", detail: "anna" });
  });

  it("what was missed: broken promises, evasions, empty slots — each exactly once", () => {
    const report = fullPlaythrough();
    const missed = report.lists.whatWasMissed;
    expect(missed.filter((entry) => entry.kind === "promise_broken")).toEqual([
      { kind: "promise_broken", id: "promiseRepairDay" }
    ]);
    expect(missed).toContainEqual({ kind: "conflict_evaded", id: "center_vs_network", detail: "evade" });
    expect(missed).toContainEqual({ kind: "missed_slot", id: "story" });
    expect(missed).toContainEqual({ kind: "missed_slot", id: "invite" });
  });

  it("debrief cards carry the evidence, the ending travels with the report", () => {
    const report = fullPlaythrough();
    expect(report.ending).toBe("fragile_progress");
    const byId = Object.fromEntries(report.debrief.map((card) => [card.id, card.evidence]));
    expect(byId.empathic_knowledge).toEqual({ empathyMaps: 1, knowledgeTableHeld: true, storiesInAssembly: true });
    expect(byId.reality_policy_bridge).toEqual({
      commissionStarted: true,
      realMandate: true,
      planCoverage: 4,
      overpromise: false
    });
    expect(byId.institutions_vs_participation).toEqual({
      trust: 6,
      voice: 4,
      conflictsEvaded: 1,
      absentGroups: 1
    });
  });
});
