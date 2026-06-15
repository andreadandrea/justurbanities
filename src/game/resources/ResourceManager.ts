import type { GameState } from "../GameState";

export type Resources = GameState["resources"];

export type CityState = "fragmented" | "awakening" | "connected" | "thriving";

export const POSITIVE_RESOURCES = ["trust", "care", "commons", "voice", "resilience"] as const;
export type PositiveResource = (typeof POSITIVE_RESOURCES)[number];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Neighbourhood Vitality (0..100): how alive the whole city looks.
 * Derived from the five collective resources minus Fragmentation
 * pressure. Placeholder weighting — tunable as content grows.
 * Starts slightly below the midpoint (resources at 0, fragmentation at 5).
 */
export function neighbourhoodVitality(resources: Resources): number {
  const positives = POSITIVE_RESOURCES.reduce((sum, key) => sum + resources[key], 0);
  return Math.round(clamp(50 + positives - resources.fragmentationGlobal * 2, 0, 100));
}

/** Maps Vitality to a discrete colour-state for the whole scene. */
export function cityState(vitality: number): CityState {
  if (vitality < 40) return "fragmented";
  if (vitality < 60) return "awakening";
  if (vitality < 85) return "connected";
  return "thriving";
}

/**
 * CSS filter applied to the whole city (canvas): the lived experience of
 * Fragmentation is desaturation; reconnection brings colour and light back.
 * Pairs with a non-colour cue (the textual state label in the HUD) so
 * colour is never the only signal.
 */
export function cityFilter(state: CityState): string {
  switch (state) {
    case "fragmented":
      return "saturate(0.4) brightness(0.95) contrast(0.96)";
    case "awakening":
      return "saturate(0.7) brightness(0.99)";
    case "connected":
      return "saturate(1) brightness(1)";
    case "thriving":
      return "saturate(1.08) brightness(1.02)";
  }
}
