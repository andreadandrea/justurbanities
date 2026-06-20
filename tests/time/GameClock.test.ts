import { describe, expect, it, vi } from "vitest";
import { GameClock, PARTS_PER_DAY } from "../../src/game/time/GameClock";
import { GameState } from "../../src/game/GameState";

describe("GameClock", () => {
  it("starts at day 1, morning", () => {
    const clock = new GameClock(new GameState());
    expect(clock.day).toBe(1);
    expect(clock.timePart).toBe(0);
    expect(clock.label()).toBe("Morning");
  });

  it("advances through the parts of a day without changing the day", () => {
    const clock = new GameClock(new GameState());
    clock.advance();
    expect(clock.day).toBe(1);
    expect(clock.timePart).toBe(1);
    expect(clock.label()).toBe("Afternoon");
    clock.advance();
    expect(clock.day).toBe(1);
    expect(clock.timePart).toBe(2);
    expect(clock.label()).toBe("Evening");
  });

  it("rolls over to the morning of the next day after the evening", () => {
    const state = new GameState();
    state.timePart = PARTS_PER_DAY - 1; // evening
    const clock = new GameClock(state);
    clock.advance();
    expect(clock.day).toBe(2);
    expect(clock.timePart).toBe(0);
    expect(clock.label()).toBe("Morning");
  });

  it("mutates the shared GameState in place (no duplicated state)", () => {
    const state = new GameState();
    const clock = new GameClock(state);
    clock.advance();
    expect(state.timePart).toBe(1);
  });

  it("notifies subscribers on every advance and supports unsubscribe", () => {
    const clock = new GameClock(new GameState());
    const listener = vi.fn();
    const unsubscribe = clock.onChange(listener);

    clock.advance();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    clock.advance();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("exposes a static label helper that wraps out-of-range indices", () => {
    expect(GameClock.labelFor(0)).toBe("Morning");
    expect(GameClock.labelFor(3)).toBe("Morning");
    expect(GameClock.labelFor(-1)).toBe("Evening");
  });

  it("fires onDayEnd only on rollover, with the day that just ended", () => {
    const clock = new GameClock(new GameState());
    const dayEnd = vi.fn();
    clock.onDayEnd(dayEnd);

    clock.advance(); // morning -> afternoon
    clock.advance(); // afternoon -> evening
    expect(dayEnd).not.toHaveBeenCalled();

    clock.advance(); // evening -> next morning (day 1 ends)
    expect(dayEnd).toHaveBeenCalledTimes(1);
    expect(dayEnd).toHaveBeenCalledWith(1);
    expect(clock.day).toBe(2);
  });

  it("supports unsubscribing from onDayEnd", () => {
    const state = new GameState();
    state.timePart = PARTS_PER_DAY - 1; // evening
    const clock = new GameClock(state);
    const dayEnd = vi.fn();
    const unsubscribe = clock.onDayEnd(dayEnd);

    unsubscribe();
    clock.advance();
    expect(dayEnd).not.toHaveBeenCalled();
  });
});
