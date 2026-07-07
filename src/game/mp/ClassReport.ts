import type { CityEvent, SharedCity } from "./CityReducer";
import { reduceSharedCity } from "./CityReducer";

/**
 * MP-4: the class report — the facilitator's educational deliverable.
 * Pure fold over the session log: who played, what the city achieved,
 * the promises board and the signed plan. Per-player rows let the
 * teacher run the debrief without ever opening a save file.
 */
export type ClassReport = {
  reportVersion: "class-1.0";
  sessionCode: string;
  city: SharedCity;
  players: Array<{
    playerId: string;
    events: number;
    questsCompleted: string[];
    empathyMaps: string[];
    firstEventAt: string | null;
    lastEventAt: string | null;
  }>;
  totals: {
    events: number;
    questsCompleted: number;
    promisesKept: number;
    promisesBroken: number;
    transformativeCrises: number;
  };
};

export function buildClassReport(sessionCode: string, events: CityEvent[]): ClassReport {
  const city = reduceSharedCity(events);

  const byPlayer = new Map<string, CityEvent[]>();
  for (const event of events) {
    const list = byPlayer.get(event.userId) ?? [];
    list.push(event);
    byPlayer.set(event.userId, list);
  }

  const players = [...byPlayer.entries()]
    .map(([playerId, playerEvents]) => {
      const sorted = [...playerEvents].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        playerId,
        events: playerEvents.length,
        questsCompleted: Object.entries(city.quests)
          .filter(([, completion]) => completion.by === playerId)
          .map(([questId]) => questId),
        empathyMaps: Object.entries(city.empathyMaps)
          .filter(([, map]) => map.by === playerId)
          .map(([who]) => who),
        firstEventAt: sorted[0]?.createdAt ?? null,
        lastEventAt: sorted[sorted.length - 1]?.createdAt ?? null
      };
    })
    .sort((a, b) => a.playerId.localeCompare(b.playerId));

  const promiseStatuses = Object.values(city.promises);
  return {
    reportVersion: "class-1.0",
    sessionCode,
    city,
    players,
    totals: {
      events: events.length,
      questsCompleted: Object.keys(city.quests).length,
      promisesKept: promiseStatuses.filter((promise) => promise.status === "kept").length,
      promisesBroken: promiseStatuses.filter((promise) => promise.status === "broken").length,
      transformativeCrises: Object.values(city.crises).filter((crisis) => crisis.tier === "transformative").length
    }
  };
}
