export type WorldBounds = { width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * 3/4 follow camera. Keeps the target centred in the viewport and clamps to
 * the world bounds so the view never shows outside the map. When the world
 * is smaller than the viewport on an axis, it stays centred on that axis.
 */
export class Camera2D {
  x = 0;
  y = 0;

  constructor(public world: WorldBounds) {}

  setWorld(world: WorldBounds): void {
    this.world = world;
  }

  /** Centre on (targetX, targetY) within the given viewport, clamped to world. */
  follow(targetX: number, targetY: number, viewportWidth: number, viewportHeight: number): void {
    this.x = this.axis(targetX, viewportWidth, this.world.width);
    this.y = this.axis(targetY, viewportHeight, this.world.height);
  }

  private axis(target: number, viewport: number, world: number): number {
    if (world <= viewport) {
      // World narrower than the screen: centre the world on this axis.
      return (world - viewport) / 2;
    }
    return clamp(target - viewport / 2, 0, world - viewport);
  }
}
