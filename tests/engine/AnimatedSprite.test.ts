import { describe, expect, it } from "vitest";
import { AnimatedSprite, movementAnimation, type AnimationSet } from "../../src/engine/AnimatedSprite";

describe("movementAnimation", () => {
  it("walks in the dominant axis direction", () => {
    expect(movementAnimation(5, 1, "down").name).toBe("walk_right");
    expect(movementAnimation(-5, 1, "down").name).toBe("walk_left");
    expect(movementAnimation(1, -5, "down").name).toBe("walk_up");
    expect(movementAnimation(1, 5, "down").name).toBe("walk_down");
  });

  it("idles in the last faced direction when not moving", () => {
    const result = movementAnimation(0, 0, "left");
    expect(result.name).toBe("idle_left");
    expect(result.direction).toBe("left");
  });
});

describe("AnimatedSprite", () => {
  const img = (id: string) => ({ id } as unknown as HTMLImageElement);
  const set: AnimationSet = {
    atlas: "x",
    frameRate: 4, // 0.25s per frame
    animations: {
      idle_down: ["i0"],
      walk_down: ["w0", "w1", "w2", "w3"]
    }
  };
  const frames = new Map<string, HTMLImageElement>([
    ["i0", img("i0")],
    ["w0", img("w0")],
    ["w1", img("w1")],
    ["w2", img("w2")],
    ["w3", img("w3")]
  ]);

  it("advances frames at the animation frame rate and loops", () => {
    const sprite = new AnimatedSprite(set, frames);
    sprite.play("walk_down");
    expect((sprite.image() as unknown as { id: string }).id).toBe("w0");
    sprite.update(0.25);
    expect((sprite.image() as unknown as { id: string }).id).toBe("w1");
    sprite.update(0.5); // two more frames
    expect((sprite.image() as unknown as { id: string }).id).toBe("w3");
    sprite.update(0.25); // loops back
    expect((sprite.image() as unknown as { id: string }).id).toBe("w0");
  });

  it("holds a single-frame animation and ignores unknown names", () => {
    const sprite = new AnimatedSprite(set, frames);
    sprite.play("idle_down");
    sprite.update(10);
    expect((sprite.image() as unknown as { id: string }).id).toBe("i0");
    sprite.play("does_not_exist");
    expect((sprite.image() as unknown as { id: string }).id).toBe("i0");
  });
});
