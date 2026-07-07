import type { GameState } from "../GameState";
import balancing from "../../data/balancing.json";

export type Resources = GameState["resources"];

export type CityState = "fragmented" | "awakening" | "connected" | "thriving";

export const POSITIVE_RESOURCES = ["trust", "care", "commons", "voice", "resilience"] as const;
export type PositiveResource = (typeof POSITIVE_RESOURCES)[number];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Neighbourhood Vitality (0..100): how alive the whole city looks.
 * Derived from the five collective resources minus Fragmentation
 * pressure. Weights come from the balancing sheet (task 9.4).
 */
export function neighbourhoodVitality(resources: Resources): number {
  const positives = POSITIVE_RESOURCES.reduce((sum, key) => sum + resources[key], 0);
  return Math.round(
    clamp(balancing.vitality.base + positives - resources.fragmentationGlobal * balancing.vitality.fragmentationWeight, 0, 100)
  );
}

/** Maps Vitality to a discrete colour-state for the whole scene. */
export function cityState(vitality: number): CityState {
  if (vitality < balancing.vitality.states.awakening) return "fragmented";
  if (vitality < balancing.vitality.states.connected) return "awakening";
  if (vitality < balancing.vitality.states.thriving) return "connected";
  return "thriving";
}

/**
 * CSS filter applied to the whole city (canvas): the lived experience of
 * Fragmentation is desaturation; reconnection brings colour and light back.
 * Pairs with a non-colour cue (the textual state label in the HUD) so
 * colour is never the only signal.
 */
export function cityFilter(state: CityState): string {
  // Keep our identity but lean vivid: even "connected" is slightly boosted,
  // and "thriving" reads as a bright, saturated city.
  switch (state) {
    case "fragmented":
      return "saturate(0.45) brightness(0.95) contrast(0.97)";
    case "awakening":
      return "saturate(0.85) brightness(1)";
    case "connected":
      return "saturate(1.15) brightness(1.03)";
    case "thriving":
      return "saturate(1.35) brightness(1.06)";
  }
}
