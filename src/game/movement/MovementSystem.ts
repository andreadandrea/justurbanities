import type { Direction } from "../../engine/AnimatedSprite";

export type Vec2 = { x: number; y: number };

/** World extents in pixels (the camera follows; the player is clamped inside). */
export type WorldBounds = { width: number; height: number };

/** Margins kept clear of the world edges so the player never leaves the map. */
export type MovementMargins = {
  /** Clamp on the left/right/bottom edges. */
  edge: number;
  /** Larger clamp on the top so the tall sprite stays fully on-screen. */
  top: number;
};

export type MovementInput = {
  /** Current player position in world space. */
  position: Vec2;
  /** Normalised key axis from InputManager (each component in [-1, 1]). */
  axis: Vec2;
  /** Optional pointer move target in world space (already camera-corrected). */
  pointerTarget: Vec2 | null;
  /** Seconds since the last frame. */
  dt: number;
  /** Movement speed in world units per second. */
  speed: number;
  /** World bounds to clamp the result inside. */
  bounds: WorldBounds;
  /** Edge/top clamp margins. */
  margins: MovementMargins;
  /** Last non-zero facing, kept while idle so the sprite doesn't snap. */
  facing: Direction;
};

export type MovementResult = {
  /** New clamped position in world space. */
  position: Vec2;
  /** Resulting facing (last non-zero movement direction). */
  facing: Direction;
  /**
   * Whether the pointer target was reached this step. When true the caller
   * should clear its stored pointer target.
   */
  pointerArrived: boolean;
};

/** Distance (world units) within which a pointer target counts as reached. */
export const POINTER_ARRIVAL_THRESHOLD = 5;

/**
 * Pure, canvas-free player movement. Given a position, an input axis, an
 * optional pointer target and the world bounds, it returns the new position,
 * the resulting facing, and whether a pointer target was reached.
 *
 * Rendering, camera and sprite animation stay in the scene; this only does
 * the maths so it can be unit-tested without a DOM/canvas.
 */
export function stepMovement(input: MovementInput): MovementResult {
  const { position, axis, dt, speed, bounds, margins } = input;
  let x = position.x;
  let y = position.y;

  // Keyboard axis movement.
  x += axis.x * speed * dt;
  y += axis.y * speed * dt;

  // Pointer click-to-target movement (one straight step toward the target).
  let pointerArrived = false;
  if (input.pointerTarget) {
    const dx = input.pointerTarget.x - x;
    const dy = input.pointerTarget.y - y;
    const distance = Math.hypot(dx, dy);
    if (distance > POINTER_ARRIVAL_THRESHOLD) {
      x += (dx / distance) * speed * dt;
      y += (dy / distance) * speed * dt;
    } else {
      pointerArrived = true;
    }
  }

  const clampedX = clamp(x, margins.edge, bounds.width - margins.edge);
  const clampedY = clamp(y, margins.top, bounds.height - margins.edge);

  return {
    position: { x: clampedX, y: clampedY },
    facing: faceFrom(clampedX - position.x, clampedY - position.y, input.facing),
    pointerArrived
  };
}

/**
 * Last-non-zero facing from a movement delta. Mirrors movementAnimation's
 * axis bias (horizontal wins ties) so the sprite and prompt stay consistent.
 */
export function faceFrom(dx: number, dy: number, lastDirection: Direction): Direction {
  if (Math.hypot(dx, dy) <= 0.01) return lastDirection;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
