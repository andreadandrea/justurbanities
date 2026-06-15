export type AnimationSet = {
  atlas: string;
  frameRate: number;
  animations: Record<string, string[]>;
};

export type Direction = "down" | "up" | "left" | "right";

/**
 * Picks the animation name for a movement vector. Keeps facing the last
 * direction while idle, so a stopped character doesn't snap to a default.
 */
export function movementAnimation(
  dx: number,
  dy: number,
  lastDirection: Direction
): { name: string; direction: Direction } {
  const moving = Math.hypot(dx, dy) > 0.01;
  let direction = lastDirection;
  if (moving) {
    direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
  }
  return { name: `${moving ? "walk" : "idle"}_${direction}`, direction };
}

/** Plays frame sequences from an AnimationSet against a map of loaded frames. */
export class AnimatedSprite {
  private currentName: string;
  private elapsed = 0;
  private frameIndex = 0;

  constructor(
    private readonly set: AnimationSet,
    private readonly frames: Map<string, HTMLImageElement>
  ) {
    this.currentName = Object.keys(set.animations)[0] ?? "";
  }

  play(name: string): void {
    if (name === this.currentName) return;
    if (!this.set.animations[name]) return; // unknown animation: keep current
    this.currentName = name;
    this.elapsed = 0;
    this.frameIndex = 0;
  }

  update(dt: number): void {
    const frames = this.set.animations[this.currentName];
    if (!frames || frames.length < 2) return;
    const step = 1 / this.set.frameRate;
    this.elapsed += dt;
    while (this.elapsed >= step) {
      this.elapsed -= step;
      this.frameIndex = (this.frameIndex + 1) % frames.length;
    }
  }

  image(): HTMLImageElement | undefined {
    const frames = this.set.animations[this.currentName];
    if (!frames || frames.length === 0) return undefined;
    const id = frames[Math.min(this.frameIndex, frames.length - 1)];
    return this.frames.get(id);
  }
}
