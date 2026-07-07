import type { GameState } from "../GameState";
import type { Quest } from "../../types/Quest";
import type { PromiseView } from "../promise/PromiseManager";
import type { CityEvent } from "../mp/CityReducer";
import { reduceSharedCity } from "../mp/CityReducer";

/**
 * Player dashboard data (ratified 2026-07-07): two pure builders — "my
 * game" (live personal state) and "my contribution" (my slice of the
 * shared-city event log). Pure functions so the panel stays dumb and the
 * numbers are pinned by tests.
 */

export type MyGameSummary = {
  day: number;
  timePart: number;
  chapter: number;
  activeQuests: Quest[];
  promises: PromiseView[];
  resources: GameState["resources"];
};

export function buildMyGame(state: GameState, activeQuests: Quest[], promises: PromiseView[]): MyGameSummary {
  const vars = state.variables;
  const chapter =
    vars.crisis_week_ready === true || vars.chapter3_closing_seen === true
      ? 4
      : vars.chapter3_unlocked === true
        ? 3
        : vars.chapter2_unlocked === true
          ? 2
          : 1;
  return {
    day: state.day,
    timePart: state.timePart,
    chapter,
    activeQuests,
    promises,
    resources: { ...state.resources }
  };
}

export type MyContribution = {
  events: number;
  /** Commutative resource increments I pushed into the shared city. */
  resourcesContributed: Record<string, number>;
  /** Quests the city credits to me (first completion wins). */
  questsCompleted: string[];
  empathyMaps: string[];
  promisesKept: number;
  promisesBroken: number;
  classTotals: {
    players: number;
    events: number;
    questsCompleted: number;
  };
};

export function buildMyContribution(playerId: string, events: CityEvent[]): MyContribution {
  const city = reduceSharedCity(events);
  const mine = events.filter((event) => event.userId === playerId);

  const resourcesContributed: Record<string, number> = {};
  let promisesKept = 0;
  let promisesBroken = 0;
  for (const event of mine) {
    if (event.type === "resource_delta") {
      const key = String(event.payload.key ?? "");
      const value = Number(event.payload.value ?? 0);
      if (key) resourcesContributed[key] = (resourcesContributed[key] ?? 0) + value;
    }
    if (event.type === "promise_kept") promisesKept += 1;
    if (event.type === "promise_broken") promisesBroken += 1;
  }

  return {
    events: mine.length,
    resourcesContributed,
    questsCompleted: Object.entries(city.quests)
      .filter(([, completion]) => completion.by === playerId)
      .map(([questId]) => questId)
      .sort(),
    empathyMaps: Object.entries(city.empathyMaps)
      .filter(([, map]) => map.by === playerId)
      .map(([who]) => who)
      .sort(),
    promisesKept,
    promisesBroken,
    classTotals: {
      players: new Set(events.map((event) => event.userId)).size,
      events: events.length,
      questsCompleted: Object.keys(city.quests).length
    }
  };
}
