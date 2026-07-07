import { describe, expect, it } from "vitest";
import { buildClassReport } from "../../src/game/mp/ClassReport";
import { fetchSessionEvents } from "../../src/sync/SupabaseRemoteApi";
import type { CityEvent } from "../../src/game/mp/CityReducer";

let counter = 0;
function event(userId: string, type: string, payload: Record<string, unknown>, createdAt: string): CityEvent {
  return { id: `e${++counter}`, userId, type, payload, createdAt };
}

describe("MP-4 class report (task 8.4)", () => {
  function classLog(): CityEvent[] {
    return [
      event("kim", "resource_delta", { key: "voice", value: 2 }, "2026-07-07T09:00:00.000Z"),
      event("kim", "quest_completed", { questId: "N01" }, "2026-07-07T09:05:00.000Z"),
      event("kim", "empathy_map", { who: "viveca", posture: "silence" }, "2026-07-07T09:10:00.000Z"),
      event("lea", "quest_completed", { questId: "N02" }, "2026-07-07T09:07:00.000Z"),
      event("lea", "promise_kept", { promiseId: "promiseSaferCrossing", owner: "ben" }, "2026-07-07T10:00:00.000Z"),
      event("lea", "promise_broken", { promiseId: "promiseRepairDay", owner: "sigrid" }, "2026-07-07T10:30:00.000Z"),
      event("kim", "crisis_resolved", { crisisId: "CRISIS_HEATWAVE", tier: "transformative" }, "2026-07-07T11:00:00.000Z")
    ];
  }

  it("summarizes the whole class per player and in totals", () => {
    const report = buildClassReport("ABC234", classLog());
    expect(report.sessionCode).toBe("ABC234");
    expect(report.players.map((player) => player.playerId)).toEqual(["kim", "lea"]);

    const kim = report.players[0];
    expect(kim.events).toBe(4);
    expect(kim.questsCompleted).toEqual(["N01"]);
    expect(kim.empathyMaps).toEqual(["viveca"]);
    expect(kim.firstEventAt).toBe("2026-07-07T09:00:00.000Z");
    expect(kim.lastEventAt).toBe("2026-07-07T11:00:00.000Z");

    expect(report.totals).toEqual({
      events: 7,
      questsCompleted: 2,
      promisesKept: 1,
      promisesBroken: 1,
      transformativeCrises: 1
    });
    // The dashboard reads the same fold the players' clients use.
    expect(report.city.resources.voice).toBe(2);
    expect(report.city.crises.CRISIS_HEATWAVE.tier).toBe("transformative");
  });

  it("an empty session yields an empty but well-formed report", () => {
    const report = buildClassReport("ABC234", []);
    expect(report.players).toEqual([]);
    expect(report.totals.events).toBe(0);
    expect(report.city.planMeasures).toEqual([]);
  });
});

describe("MP-4 fetchSessionEvents", () => {
  it("reads the remote log and unwraps queue rows into city events", async () => {
    const rows = [
      {
        entity_id: "e1",
        player_id: "kim",
        ts: "2026-07-07T09:00:05.000Z",
        payload: {
          id: "e1",
          sessionId: "s1",
          userId: "local-user",
          type: "resource_delta",
          payload: { key: "voice", value: 2 },
          createdAt: "2026-07-07T09:00:00.000Z",
          synced: 0
        }
      }
    ];
    const calls: string[] = [];
    const events = await fetchSessionEvents(
      { url: "https://eu-project.supabase.co", anonKey: "anon-key", sessionCode: "ABC234" },
      async (input) => {
        calls.push(input);
        return { ok: true, status: 200, json: async () => rows };
      }
    );
    expect(calls[0]).toContain("/rest/v1/session_events?session_code=eq.ABC234&order=seq.asc");
    expect(events).toEqual([
      {
        id: "e1",
        userId: "kim",
        type: "resource_delta",
        payload: { key: "voice", value: 2 },
        createdAt: "2026-07-07T09:00:00.000Z"
      }
    ]);
  });

  it("throws on HTTP errors so the dashboard can show a retry state", async () => {
    await expect(
      fetchSessionEvents(
        { url: "https://eu-project.supabase.co", anonKey: "anon-key", sessionCode: "ABC234" },
        async () => ({ ok: false, status: 403, json: async () => [] })
      )
    ).rejects.toThrow("HTTP 403");
  });
});
