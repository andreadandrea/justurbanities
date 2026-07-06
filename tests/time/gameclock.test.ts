import { describe, expect, it } from "vitest";
import { GameClock, type ClockEvent } from "../../src/game/time/GameClock";
import { GameState } from "../../src/game/GameState";

function setup() {
  const state = new GameState();
  const clock = new GameClock(state);
  const events: ClockEvent[] = [];
  clock.on((event) => events.push(event));
  return { state, clock, events };
}

describe("GameClock", () => {
  it("starts at day 1, morning", () => {
    const { clock } = setup();
    expect(clock.day).toBe(1);
    expect(clock.timePart).toBe(0);
    expect(clock.timePartName).toBe("morning");
  });

  it("advances through the parts of the day", () => {
    const { clock } = setup();
    clock.advance();
    expect(clock.timePartName).toBe("afternoon");
    clock.advance();
    expect(clock.timePartName).toBe("evening");
    expect(clock.day).toBe(1);
  });

  it("rolls over to the next day's morning after evening", () => {
    const { clock } = setup();
    clock.advance(3);
    expect(clock.day).toBe(2);
    expect(clock.timePartName).toBe("morning");
  });

  it("fires dayEnded and dayStarted around the rollover, in order", () => {
    const { clock, events } = setup();
    clock.advance(3);
    expect(events.map((e) => e.type)).toEqual([
      "timeAdvanced",
      "timeAdvanced",
      "dayEnded",
      "dayStarted",
      "timeAdvanced"
    ]);
    const ended = events.find((e) => e.type === "dayEnded");
    const started = events.find((e) => e.type === "dayStarted");
    expect(ended).toMatchObject({ day: 1 });
    expect(started).toMatchObject({ day: 2 });
  });

  it("timeAdvanced always reports the position after the step", () => {
    const { clock, events } = setup();
    clock.advance(4);
    const advanced = events.filter((e) => e.type === "timeAdvanced");
    expect(advanced).toEqual([
      { type: "timeAdvanced", day: 1, timePart: 1 },
      { type: "timeAdvanced", day: 1, timePart: 2 },
      { type: "timeAdvanced", day: 2, timePart: 0 },
      { type: "timeAdvanced", day: 2, timePart: 1 }
    ]);
  });

  it("mutates GameState directly so saves capture the clock", () => {
    const { clock, state } = setup();
    clock.advance(5);
    expect(state.day).toBe(2);
    expect(state.timePart).toBe(2);

    const restored = new GameState();
    restored.restore(state.snapshot());
    const restoredClock = new GameClock(restored);
    expect(restoredClock.day).toBe(2);
    expect(restoredClock.timePartName).toBe("evening");
  });

  it("unsubscribe stops the listener", () => {
    const state = new GameState();
    const clock = new GameClock(state);
    const events: ClockEvent[] = [];
    const off = clock.on((event) => events.push(event));
    clock.advance();
    off();
    clock.advance();
    expect(events).toHaveLength(1);
  });

  it("normalises corrupt timePart values from old saves", () => {
    const state = new GameState();
    state.timePart = 99 as never;
    const clock = new GameClock(state);
    expect(clock.timePart).toBe(0);
    clock.advance();
    expect(clock.timePart).toBe(1);
  });
});
