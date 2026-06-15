import { describe, expect, it } from "vitest";
import { Camera2D } from "../../src/engine/Camera2D";

describe("Camera2D", () => {
  it("centres on the target inside a large world", () => {
    const cam = new Camera2D({ width: 2000, height: 1300 });
    cam.follow(1000, 650, 800, 600);
    expect(cam.x).toBe(600); // 1000 - 400
    expect(cam.y).toBe(350); // 650 - 300
  });

  it("clamps to world edges so the view never leaves the map", () => {
    const cam = new Camera2D({ width: 2000, height: 1300 });
    cam.follow(0, 0, 800, 600);
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);

    cam.follow(5000, 5000, 800, 600);
    expect(cam.x).toBe(1200); // 2000 - 800
    expect(cam.y).toBe(700); // 1300 - 600
  });

  it("centres the world on an axis narrower than the viewport", () => {
    const cam = new Camera2D({ width: 600, height: 400 });
    cam.follow(300, 200, 800, 600);
    expect(cam.x).toBe(-100); // (600 - 800) / 2
    expect(cam.y).toBe(-100); // (400 - 600) / 2
  });
});
