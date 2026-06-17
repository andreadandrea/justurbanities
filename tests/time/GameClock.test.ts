import { describe, expect, it, vi } from "vitest";
import { GameClock, partName, PARTS_PER_DAY, TIME_PARTS } from "../../src/game/time/GameClock";
import { GameState } from "../../src/game/GameState";

const clockOn = (day = 1, part = 0) => {
  const state = new GameState();
  state.day = day;
  state.timePart = part;
  return { state, clock: new GameClock(state) };
};

describe("partName", () => {
  it("maps part indices to names and wraps", () => {
    expect(partName(0)).toBe("morning");
    expect(partName(1)).toBe("afternoon");
    expect(partName(2)).toBe("evening");
    expect(partName(PARTS_PER_DAY)).toBe("morning");
  });
});

describe("GameClock", () => {
  it("advances through the parts of a day", () => {
    const { clock } = clockOn(1, 0);
    expect(clock.partName).toBe("morning");
    clock.advance();
    expect(clock.partName).toBe("afternoon");
    clock.advance();
    expect(clock.partName).toBe("evening");
    expect(clock.day).toBe(1);
  });

  it("rolls over into the next day after the last part", () => {
    const { state, clock } = clockOn(1, TIME_PARTS.length - 1);
    clock.advance();
    expect(state.day).toBe(2);
    expect(clock.partName).toBe("morning");
  });

  it("advances multiple parts at once across day boundaries", () => {
    const { clock } = clockOn(1, 2);
    clock.advance(4); // evening(2) + 4 = 6 -> +2 days, part 0
    expect(clock.day).toBe(3);
    expect(clock.partName).toBe("morning");
  });

  it("ignores non-positive steps", () => {
    const { state, clock } = clockOn(2, 1);
    clock.advance(0);
    clock.advance(-3);
    expect(state.day).toBe(2);
    expect(state.timePart).toBe(1);
  });

  it("notifies and stops notifying listeners", () => {
    const { clock } = clockOn();
    const listener = vi.fn();
    const off = clock.onChange(listener);
    clock.advance();
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    clock.advance();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("formats a human-readable label", () => {
    const { clock } = clockOn(3, 2);
    expect(clock.label()).toBe("Day 3 · Evening");
    expect(clock.isLastPartOfDay).toBe(true);
  });
});
