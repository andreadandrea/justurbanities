import { describe, expect, it } from "vitest";
import {
  findActiveInteractable,
  DEFAULT_INTERACTION_RADIUS,
  type Proximable
} from "../../src/game/interaction/ProximitySystem";

describe("findActiveInteractable", () => {
  it("returns undefined when nothing is in reach", () => {
    const player = { x: 0, y: 0 };
    const candidates: Proximable[] = [{ x: 1000, y: 0 }];
    expect(findActiveInteractable(player, candidates)).toBeUndefined();
  });

  it("uses the default radius when none is specified (preserves old reach)", () => {
    const player = { x: 0, y: 0 };
    const justInside: Proximable = { x: DEFAULT_INTERACTION_RADIUS - 1, y: 0 };
    const justOutside: Proximable = { x: DEFAULT_INTERACTION_RADIUS + 1, y: 0 };
    expect(findActiveInteractable(player, [justInside])).toBe(justInside);
    expect(findActiveInteractable(player, [justOutside])).toBeUndefined();
  });

  it("includes a candidate exactly on its radius boundary", () => {
    const player = { x: 0, y: 0 };
    const onBoundary: Proximable = { x: 50, y: 0, interactionRadius: 50 };
    expect(findActiveInteractable(player, [onBoundary])).toBe(onBoundary);
  });

  it("respects a per-candidate interactionRadius override", () => {
    const player = { x: 0, y: 0 };
    // 200 units away but with a wide radius → reachable.
    const wide: Proximable = { x: 200, y: 0, interactionRadius: 250 };
    // 100 units away but with a narrow radius → out of reach.
    const narrow: Proximable = { x: 100, y: 0, interactionRadius: 50 };
    expect(findActiveInteractable(player, [narrow, wide])).toBe(wide);
  });

  it("returns the nearest in-range candidate when several are reachable", () => {
    const player = { x: 0, y: 0 };
    const near: Proximable = { x: 30, y: 0 };
    const far: Proximable = { x: 120, y: 0 };
    expect(findActiveInteractable(player, [far, near])).toBe(near);
  });

  it("breaks ties (equal distance) toward the first candidate encountered", () => {
    const player = { x: 0, y: 0 };
    const a: Proximable = { x: 40, y: 0 };
    const b: Proximable = { x: -40, y: 0 };
    expect(findActiveInteractable(player, [a, b])).toBe(a);
  });

  it("carries through the concrete candidate type", () => {
    type Npc = Proximable & { id: string };
    const player = { x: 0, y: 0 };
    const anna: Npc = { id: "anna", x: 20, y: 0 };
    const result = findActiveInteractable(player, [anna]);
    expect(result?.id).toBe("anna");
  });
});
