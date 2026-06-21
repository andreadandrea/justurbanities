import { describe, expect, it } from "vitest";
import {
  faceFrom,
  stepMovement,
  POINTER_ARRIVAL_THRESHOLD,
  type MovementInput
} from "../../src/game/movement/MovementSystem";

const base = (overrides: Partial<MovementInput> = {}): MovementInput => ({
  position: { x: 500, y: 500 },
  axis: { x: 0, y: 0 },
  pointerTarget: null,
  dt: 0.1,
  speed: 200,
  bounds: { width: 2000, height: 1500 },
  margins: { edge: 40, top: 150 },
  facing: "down",
  ...overrides
});

describe("stepMovement — axis movement", () => {
  it("moves along the input axis scaled by speed and dt", () => {
    const result = stepMovement(base({ axis: { x: 1, y: 0 }, speed: 200, dt: 0.1 }));
    expect(result.position.x).toBeCloseTo(520);
    expect(result.position.y).toBeCloseTo(500);
  });

  it("moves up when the y axis is negative", () => {
    const result = stepMovement(base({ axis: { x: 0, y: -1 } }));
    expect(result.position.y).toBeCloseTo(480);
    expect(result.facing).toBe("up");
  });

  it("does not move with a zero axis and no pointer", () => {
    const result = stepMovement(base());
    expect(result.position).toEqual({ x: 500, y: 500 });
    expect(result.pointerArrived).toBe(false);
  });
});

describe("stepMovement — pointer target", () => {
  it("steps toward a far target without overshooting per frame", () => {
    const result = stepMovement(base({ pointerTarget: { x: 1000, y: 500 }, speed: 200, dt: 0.1 }));
    // 200 * 0.1 = 20 units toward the target on the x axis.
    expect(result.position.x).toBeCloseTo(520);
    expect(result.pointerArrived).toBe(false);
  });

  it("reports arrival when within the threshold", () => {
    const target = { x: 500 + POINTER_ARRIVAL_THRESHOLD - 1, y: 500 };
    const result = stepMovement(base({ pointerTarget: target }));
    expect(result.pointerArrived).toBe(true);
  });

  it("does not report arrival when still outside the threshold", () => {
    const target = { x: 500 + POINTER_ARRIVAL_THRESHOLD + 50, y: 500 };
    const result = stepMovement(base({ pointerTarget: target }));
    expect(result.pointerArrived).toBe(false);
  });
});

describe("stepMovement — bounds clamping", () => {
  it("clamps to the edge margin on the left/bottom/right", () => {
    const result = stepMovement(
      base({ position: { x: 45, y: 500 }, axis: { x: -1, y: 0 }, speed: 1000, dt: 1 })
    );
    expect(result.position.x).toBe(40);
  });

  it("clamps the top using the larger top margin", () => {
    const result = stepMovement(
      base({ position: { x: 500, y: 160 }, axis: { x: 0, y: -1 }, speed: 1000, dt: 1 })
    );
    expect(result.position.y).toBe(150);
  });

  it("clamps the right and bottom against the world bounds", () => {
    const result = stepMovement(
      base({ position: { x: 1990, y: 1490 }, axis: { x: 1, y: 1 }, speed: 1000, dt: 1 })
    );
    expect(result.position.x).toBe(2000 - 40);
    expect(result.position.y).toBe(1500 - 40);
  });
});

describe("stepMovement — facing", () => {
  it("keeps the last facing while idle", () => {
    const result = stepMovement(base({ facing: "left" }));
    expect(result.facing).toBe("left");
  });

  it("faces by the dominant axis; exact ties resolve vertically (matches movementAnimation)", () => {
    expect(stepMovement(base({ axis: { x: -1, y: -1 } })).facing).toBe("up");
    expect(stepMovement(base({ axis: { x: 1, y: 1 } })).facing).toBe("down");
    expect(stepMovement(base({ axis: { x: -1, y: 0 } })).facing).toBe("left");
    expect(stepMovement(base({ axis: { x: 1, y: 0 } })).facing).toBe("right");
  });
});

describe("faceFrom", () => {
  it("returns the last direction for a negligible delta", () => {
    expect(faceFrom(0, 0, "right")).toBe("right");
  });

  it("resolves exact ties vertically (mirrors movementAnimation)", () => {
    expect(faceFrom(5, 5, "up")).toBe("down");
    expect(faceFrom(-5, -5, "up")).toBe("up");
  });

  it("returns left/right for a dominant horizontal delta", () => {
    expect(faceFrom(-6, 5, "down")).toBe("left");
    expect(faceFrom(6, 5, "down")).toBe("right");
  });

  it("returns up/down for a dominant vertical delta", () => {
    expect(faceFrom(1, -5, "left")).toBe("up");
    expect(faceFrom(1, 5, "left")).toBe("down");
  });
});
