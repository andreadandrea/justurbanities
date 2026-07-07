import { describe, expect, it } from "vitest";
import { PlaytestInstrumentation } from "../../src/game/playtest/PlaytestInstrumentation";
import { DialogueManager } from "../../src/game/dialogue/DialogueManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { GameState } from "../../src/game/GameState";
import { QuestManager } from "../../src/game/quest/QuestManager";
import type { DialogueFile } from "../../src/types/Dialogue";

function harness() {
  const logged: Array<{ type: string; payload: Record<string, unknown> }> = [];
  let clock = 0;
  const instrumentation = new PlaytestInstrumentation(
    (type, payload) => logged.push({ type, payload }),
    () => clock
  );
  return { logged, instrumentation, tick: (ms: number) => (clock += ms) };
}

const DIALOGUE: DialogueFile = {
  dialogues: [
    {
      id: "d1",
      speakerId: "anna",
      startNode: "a",
      nodes: {
        a: { text: "content.x", choices: [{ id: "go", label: "content.y", next: "b" }] },
        b: { text: "content.z", choices: [{ id: "bye", label: "content.w", end: true }] }
      }
    }
  ]
};

describe("PlaytestInstrumentation (task 9.3)", () => {
  it("times each node until its choice", () => {
    const { logged, instrumentation, tick } = harness();
    instrumentation.nodeEntered("d1", "a");
    tick(1200);
    instrumentation.choiceMade("d1", "a", "go");
    instrumentation.nodeEntered("d1", "b");
    tick(300);
    instrumentation.choiceMade("d1", "b", "bye");
    expect(logged).toEqual([
      { type: "node_timing", payload: { dialogueId: "d1", nodeId: "a", choiceId: "go", ms: 1200 } },
      { type: "node_timing", payload: { dialogueId: "d1", nodeId: "b", choiceId: "bye", ms: 300 } }
    ]);
  });

  it("marks a node abandoned when another dialogue takes over", () => {
    const { logged, instrumentation, tick } = harness();
    instrumentation.nodeEntered("d1", "a");
    tick(500);
    instrumentation.nodeEntered("d2", "start"); // crisis scene interrupts
    expect(logged).toEqual([
      { type: "node_timing", payload: { dialogueId: "d1", nodeId: "a", ms: 500, abandoned: true } }
    ]);
  });

  it("snapshots the resource curve at day end", () => {
    const { logged, instrumentation } = harness();
    instrumentation.dayEnded(3, { trust: 4, voice: 2 });
    expect(logged).toEqual([{ type: "day_resources", payload: { day: 3, trust: 4, voice: 2 } }]);
  });

  it("hooks into the DialogueManager: every node of a real dialogue is timed", () => {
    const { logged, instrumentation, tick } = harness();
    const state = new GameState();
    const quests = new QuestManager();
    quests.load({ quests: [] });
    const manager = new DialogueManager(new EffectResolver(state, quests));
    manager.load(DIALOGUE);
    manager.setInstrumentation(instrumentation);

    manager.start("d1");
    tick(800);
    manager.choose("go");
    tick(150);
    manager.choose("bye");

    const timings = logged.filter((entry) => entry.type === "node_timing");
    expect(timings).toEqual([
      { type: "node_timing", payload: { dialogueId: "d1", nodeId: "a", choiceId: "go", ms: 800 } },
      { type: "node_timing", payload: { dialogueId: "d1", nodeId: "b", choiceId: "bye", ms: 150 } }
    ]);
  });
});
