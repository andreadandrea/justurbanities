import type { GameState } from "../GameState";

/** 0 = morning, 1 = afternoon, 2 = evening. */
export type TimePart = 0 | 1 | 2;

export const TIME_PARTS = ["morning", "afternoon", "evening"] as const;
export type TimePartName = (typeof TIME_PARTS)[number];

export type ClockEvent =
  | { type: "timeAdvanced"; day: number; timePart: TimePart }
  | { type: "dayEnded"; day: number }
  | { type: "dayStarted"; day: number };

export type ClockListener = (event: ClockEvent) => void;

/**
 * Day/time cycle on top of GameState.day / GameState.timePart, which stay
 * the single source of truth so saves and restores need no extra wiring.
 * Time only moves through advance() ("pass time" action, key story beats);
 * there is no real-time clock.
 */
export class GameClock {
  private readonly listeners = new Set<ClockListener>();

  constructor(private readonly state: GameState) {}

  get day(): number {
    return this.state.day;
  }

  get timePart(): TimePart {
    return clampPart(this.state.timePart);
  }

  get timePartName(): TimePartName {
    return TIME_PARTS[this.timePart];
  }

  /** Subscribe to clock events; returns an unsubscribe function. */
  on(listener: ClockListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Advance by one or more parts of day. Evening rolls over to the next
   * day's morning, firing dayEnded then dayStarted around the transition;
   * every step fires timeAdvanced with the new position.
   */
  advance(parts = 1): void {
    for (let step = 0; step < parts; step++) {
      if (this.timePart < 2) {
        this.state.timePart = this.timePart + 1;
      } else {
        const endedDay = this.state.day;
        this.emit({ type: "dayEnded", day: endedDay });
        this.state.day = endedDay + 1;
        this.state.timePart = 0;
        this.emit({ type: "dayStarted", day: this.state.day });
      }
      this.emit({ type: "timeAdvanced", day: this.day, timePart: this.timePart });
    }
  }

  private emit(event: ClockEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

function clampPart(value: number): TimePart {
  return (value >= 0 && value <= 2 ? Math.floor(value) : 0) as TimePart;
}
