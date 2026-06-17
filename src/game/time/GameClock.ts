import type { GameState } from "../GameState";

/**
 * Day / time cycle (Gameplay Loop pillar 2). Time makes "who can show up,
 * and when" a real constraint: NPCs are available at different parts of the
 * day, and deadlines (the assembly) fall on a given day. The clock is the
 * single source of truth and operates directly on GameState's `day` /
 * `timePart` fields, so advancing time is captured by the normal save.
 */

export const TIME_PARTS = ["morning", "afternoon", "evening"] as const;
export type TimePart = (typeof TIME_PARTS)[number];
export const PARTS_PER_DAY = TIME_PARTS.length;

/** Wrap any part index into a canonical part name. */
export function partName(part: number): TimePart {
  const index = ((Math.trunc(part) % PARTS_PER_DAY) + PARTS_PER_DAY) % PARTS_PER_DAY;
  return TIME_PARTS[index];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export class GameClock {
  private readonly listeners = new Set<() => void>();

  constructor(private readonly state: GameState) {}

  get day(): number {
    return this.state.day;
  }

  /** Part index within the day (0=morning, 1=afternoon, 2=evening). */
  get part(): number {
    return this.state.timePart;
  }

  get partName(): TimePart {
    return partName(this.state.timePart);
  }

  /** Whether the current part is the last one of the day. */
  get isLastPartOfDay(): boolean {
    return this.partName === TIME_PARTS[PARTS_PER_DAY - 1];
  }

  /** Human-readable label, e.g. "Day 2 · Evening". */
  label(): string {
    return `Day ${this.day} · ${capitalize(this.partName)}`;
  }

  /** Advance by `steps` parts (default 1), rolling over into later days. */
  advance(steps = 1): void {
    if (steps <= 0) return;
    const total = this.state.timePart + steps;
    this.state.day += Math.floor(total / PARTS_PER_DAY);
    this.state.timePart = ((total % PARTS_PER_DAY) + PARTS_PER_DAY) % PARTS_PER_DAY;
    this.emit();
  }

  /** Subscribe to clock changes; returns an unsubscribe function. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
