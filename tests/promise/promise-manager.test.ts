import { describe, expect, it } from "vitest";
import { PromiseManager, type PromiseFile } from "../../src/game/promise/PromiseManager";
import { GameState } from "../../src/game/GameState";
import { GameClock } from "../../src/game/time/GameClock";
import { promiseFileSchema, validateData } from "../../src/data/validation";
import promisesData from "../../src/data/promises.json";
import en from "../../src/locales/en.json";
import itLocale from "../../src/locales/it.json";

const shipped = validateData("promises.json", promiseFileSchema, promisesData) as PromiseFile;

function world(file: PromiseFile = shipped) {
  const state = new GameState();
  const clock = new GameClock(state);
  const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
  const manager = new PromiseManager(state, (type, payload) => events.push({ type, payload }));
  manager.load(file);
  clock.on(() => manager.evaluate());
  return { state, clock, manager, events };
}

describe("PromiseManager", () => {
  it("a kept promise weaves Trust +3 (once)", () => {
    const w = world();
    w.state.variables.promiseSaferCrossing = "active";
    w.manager.evaluate();
    w.state.variables.promiseSaferCrossing = "kept";
    w.manager.evaluate();
    w.manager.evaluate(); // idempotent
    expect(w.state.resources.trust).toBe(3);
    expect(w.events).toEqual([{ type: "promise_kept", payload: { promiseId: "promiseSaferCrossing", owner: "ben" } }]);
  });

  it("an expired promise breaks: Trust −2, fragmentation +1 (once)", () => {
    const w = world();
    w.state.variables.promiseRepairDay = "active";
    w.manager.evaluate(); // made on day 1, deadline day 5
    const fragBefore = w.state.resources.fragmentationGlobal;
    w.clock.advance(3 * 4); // day 5
    expect(w.state.variables.promiseRepairDay).toBe("active");
    w.clock.advance(3); // day 6 — past the deadline
    expect(w.state.variables.promiseRepairDay).toBe("broken");
    expect(w.state.resources.trust).toBe(-2);
    expect(w.state.resources.fragmentationGlobal).toBe(fragBefore + 1);
    w.clock.advance(3);
    expect(w.state.resources.trust).toBe(-2); // scored once
    expect(w.events.map((e) => e.type)).toEqual(["promise_broken"]);
  });

  it("an active promise before its deadline changes nothing", () => {
    const w = world();
    w.state.variables.promiseClimatePrep = "active";
    w.clock.advance(6);
    expect(w.state.resources.trust).toBe(0);
    expect(w.state.variables.promiseClimatePrep).toBe("active");
  });

  it("the logbook lists status, owner and deadline", () => {
    const w = world();
    w.state.variables.promiseSaferCrossing = "active";
    w.state.variables.promiseOpenInfoPoint = "kept";
    w.manager.evaluate();
    const entries = w.manager.list();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ id: "promiseSaferCrossing", owner: "ben", status: "active", deadlineDay: 5 });
    expect(entries[1]).toMatchObject({ id: "promiseOpenInfoPoint", owner: "abdullah", status: "kept" });
  });

  it("promise state survives snapshot/restore (variables only)", () => {
    const w = world();
    w.state.variables.promiseAccessibleBusInfo = "active";
    w.manager.evaluate();
    const snapshot = w.state.snapshot();

    const w2 = world();
    w2.state.restore(snapshot);
    w2.clock.advance(3 * 6); // well past the deadline
    expect(w2.state.variables.promiseAccessibleBusInfo).toBe("broken");
  });

  it("every shipped promise has EN+IT text and a dialogue that activates it", async () => {
    const dialoguesData = (await import("../../src/data/dialogues.json")).default;
    const activated = new Set<string>();
    for (const dialogue of dialoguesData.dialogues) {
      for (const node of Object.values(dialogue.nodes) as Array<{ effects?: unknown[]; choices?: Array<{ effects?: unknown[] }> }>) {
        for (const source of [node, ...(node.choices ?? [])]) {
          for (const effect of (source.effects ?? []) as Array<{ type: string; key?: string; value?: unknown }>) {
            if (effect.type === "setVariable" && effect.value === "active" && effect.key) activated.add(effect.key);
          }
        }
      }
    }
    for (const definition of shipped.promises) {
      expect(activated.has(definition.id), `${definition.id} never activated by any dialogue`).toBe(true);
      expect((en.content.promises as Record<string, string>)[definition.id], `en text for ${definition.id}`).toBeTypeOf("string");
      expect((itLocale.content.promises as Record<string, string>)[definition.id], `it text for ${definition.id}`).toBeTypeOf("string");
    }
  });
});
