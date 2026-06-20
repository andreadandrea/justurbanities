import type { GameState } from "../GameState";

/** Number of time parts in a day (morning, afternoon, evening). */
export const PARTS_PER_DAY = 3;

/** Human-readable label for each time part, indexed by `GameState.timePart`. */
export const TIME_PART_LABELS = ["Morning", "Afternoon", "Evening"] as const;

export type TimeChangeListener = (state: GameState) => void;

/**
 * Owns advancing the day/time cycle. It does not duplicate state — it mutates
 * `GameState.day` / `GameState.timePart` in place. `advance()` moves to the
 * next part of the day, rolling over to the morning of the next day after the
 * evening. Subscribers (HUD, NPC director) are notified on every change so
 * they can refresh the world.
 */
export class GameClock {
  private readonly listeners = new Set<TimeChangeListener>();

  constructor(private readonly state: GameState) {}

  /** Current part index (0=morning, 1=afternoon, 2=evening). */
  get timePart(): number {
    return this.state.timePart;
  }

  /** Current day (starts at 1). */
  get day(): number {
    return this.state.day;
  }

  /** Label for the current time part, e.g. "Morning". */
  label(): string {
    return GameClock.labelFor(this.state.timePart);
  }

  /** Label for an arbitrary part index, clamped/wrapped into range. */
  static labelFor(timePart: number): string {
    const index = ((timePart % PARTS_PER_DAY) + PARTS_PER_DAY) % PARTS_PER_DAY;
    return TIME_PART_LABELS[index];
  }

  /**
   * Advance to the next time part. After the evening, the day rolls over to
   * the morning of the next day. Notifies subscribers afterwards.
   */
  advance(): void {
    if (this.state.timePart + 1 >= PARTS_PER_DAY) {
      this.state.timePart = 0;
      this.state.day += 1;
    } else {
      this.state.timePart += 1;
    }
    this.emit();
  }

  /** Subscribe to time changes. Returns an unsubscribe function. */
  onChange(listener: TimeChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Notify all subscribers of the current state (e.g. after a restore). */
  emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}
