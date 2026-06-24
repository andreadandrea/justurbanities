export type Point = { x: number; y: number };

/**
 * Anything the player can walk up to. `interactionRadius` lets an individual
 * NPC/POI widen or narrow its reach; when unset the system falls back to
 * DEFAULT_INTERACTION_RADIUS (which preserves the previous global reach).
 */
export type Proximable = {
  x: number;
  y: number;
  /** Per-entity reach in world units. Omit to use DEFAULT_INTERACTION_RADIUS. */
  interactionRadius?: number;
};

/**
 * Default interaction reach in world units. Matches the previous global
 * INTERACT_RANGE so nothing regresses when an entity has no explicit radius.
 */
export const DEFAULT_INTERACTION_RADIUS = 160;

/**
 * Nearest interactable within its own radius, or undefined if none is in
 * reach. Pure and canvas-free. Ties (equal distance) resolve to the first
 * candidate encountered; "<" keeps the earliest of equal distances.
 */
export function findActiveInteractable<T extends Proximable>(
  player: Point,
  candidates: readonly T[]
): T | undefined {
  let best: T | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const radius = candidate.interactionRadius ?? DEFAULT_INTERACTION_RADIUS;
    const distance = Math.hypot(candidate.x - player.x, candidate.y - player.y);
    if (distance <= radius && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
