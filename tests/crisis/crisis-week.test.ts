import { describe, expect, it } from "vitest";
import { CrisisWeek, CRISIS_WEEK_FLAG, CRISIS_WEEK_START_VAR } from "../../src/game/crisis/CrisisWeek";
import { CrisisManager } from "../../src/game/crisis/CrisisManager";
import { GameState } from "../../src/game/GameState";
import { GameClock } from "../../src/game/time/GameClock";
import { QuestManager } from "../../src/game/quest/QuestManager";
import { EffectResolver } from "../../src/game/effects/EffectResolver";
import { crisisFileSchema, questFileSchema, validateData } from "../../src/data/validation";
import type { CrisisFile } from "../../src/types/Crisis";
import type { QuestFile } from "../../src/types/Quest";
import crisesData from "../../src/data/crises.json";
import questsData from "../../src/data/quests.json";

function world() {
  const state = new GameState();
  const clock = new GameClock(state);
  const quests = new QuestManager();
  quests.load(validateData("quests.json", questFileSchema, questsData) as QuestFile);
  const resolver = new EffectResolver(state, quests);
  const manager = new CrisisManager(state, resolver);
  manager.load(validateData("crises.json", crisisFileSchema, crisesData) as CrisisFile);

  const shown: string[] = [];
  let dialogueOpen = false;
  const week = new CrisisWeek(
    state,
    clock,
    manager,
    (dialogueId) => {
      shown.push(dialogueId);
      dialogueOpen = true;
    },
    () => dialogueOpen
  );
  const closeDialogue = () => {
    dialogueOpen = false;
  };
  return { state, clock, quests, manager, week, shown, closeDialogue };
}

/** Advance one part of day, then close whatever crisis scene appeared. */
function step(w: ReturnType<typeof world>): void {
  w.clock.advance();
  w.closeDialogue();
}

describe("CrisisWeek orchestration", () => {
  it("does nothing until the ch.3 flag arms the week", () => {
    const w = world();
    for (let i = 0; i < 9; i++) step(w);
    expect(w.shown).toEqual([]);
    expect(w.state.variables[CRISIS_WEEK_START_VAR]).toBeUndefined();
  });

  it("arming starts the week on the NEXT morning", () => {
    const w = world();
    w.week.arm();
    expect(w.state.variables[CRISIS_WEEK_FLAG]).toBe(true);
    step(w); // afternoon, same day: not started yet
    expect(w.state.variables[CRISIS_WEEK_START_VAR]).toBeUndefined();
    step(w); // evening
    step(w); // rollover -> next morning: week starts, day 1 announced
    expect(w.state.variables[CRISIS_WEEK_START_VAR]).toBe(w.state.day);
    expect(w.shown).toEqual(["crisis_heatwave_announce"]);
  });

  it("announces each day once, resolves at day end, shows the tier outcome", () => {
    const w = world();
    w.week.arm();
    step(w);
    step(w);
    step(w); // morning day 1 (announce)
    step(w); // afternoon day 1 — no repeat announcement
    expect(w.shown).toEqual(["crisis_heatwave_announce"]);
    step(w); // evening day 1
    step(w); // rollover: day 1 resolves (reactive), outcome first, then day-2 announce
    expect(w.shown[1]).toBe("crisis_heatwave_reactive");
    step(w); // next part: queued day-2 announcement flushes
    expect(w.shown[2]).toBe("crisis_rumor_announce");
    expect(w.manager.resolutions()).toEqual([{ crisisId: "CRISIS_HEATWAVE", day: 1, tier: "reactive" }]);
  });

  it("a full prepared week resolves all five crises at coordinated+", () => {
    const w = world();
    // The neighbourhood wove its fabric before the week (coordinated thresholds).
    w.state.resources.trust = 3;
    w.state.resources.care = 3;
    w.state.resources.commons = 3;
    w.state.resources.voice = 3;
    w.state.resources.resilience = 3;
    w.week.arm();
    for (let i = 0; i < 3 + 5 * 3 + 3; i++) step(w);
    expect(w.manager.resolutions()).toHaveLength(5);
    for (const resolution of w.manager.resolutions()) {
      expect(resolution.tier).toBe("coordinated");
    }
    expect(w.week.completed).toBe(true);
    // 5 announcements + 5 outcomes reached the player
    expect(w.shown.filter((id) => id.endsWith("_announce"))).toHaveLength(5);
    expect(w.shown.filter((id) => id.endsWith("_coordinated"))).toHaveLength(5);
  });

  it("transformative outcomes apply the canon §6 effects", () => {
    const w = world();
    // Build everything for day 1 (HEATWAVE): care 6, commons 6, N11 done.
    w.state.resources.care = 6;
    w.state.resources.commons = 6;
    w.quests.completeQuest("N11");
    w.week.arm();
    for (let i = 0; i < 3 + 3 + 1; i++) step(w); // through day 1 + resolution
    expect(w.manager.resolutions()[0]).toMatchObject({ crisisId: "CRISIS_HEATWAVE", tier: "transformative" });
    expect(w.state.resources.commons).toBe(8); // +2 canon
    expect(w.state.resources.resilience).toBe(1); // +1 canon
    expect(w.state.variables.cool_map).toBe(true);
    expect(w.shown).toContain("crisis_heatwave_transformative");
  });

  it("a saved mid-week game resumes without re-announcing or re-resolving", () => {
    const w = world();
    w.week.arm();
    for (let i = 0; i < 5; i++) step(w); // into day 1 afternoon-ish
    const snapshot = w.state.snapshot();
    const announcedBefore = w.shown.filter((id) => id.endsWith("_announce")).length;

    // "Reload": fresh world restoring the same state.
    const w2 = world();
    w2.state.restore(snapshot);
    step(w2);
    // no duplicate announcement for a day already announced before saving
    const announcedAfter = w2.shown.filter((id) => id === "crisis_heatwave_announce").length;
    expect(announcedBefore).toBe(1);
    expect(announcedAfter).toBe(0);
  });

  it("every crisis dialogue referenced by the orchestrator exists in the data", async () => {
    const { dialogueFileSchema } = await import("../../src/data/validation");
    const dialoguesData = (await import("../../src/data/dialogues.json")).default;
    const dialogues = validateData("dialogues.json", dialogueFileSchema, dialoguesData);
    const ids = new Set(dialogues.dialogues.map((d) => d.id));
    for (const slug of ["heatwave", "rumor", "offer", "closure", "flood"]) {
      expect(ids.has(`crisis_${slug}_announce`), `missing crisis_${slug}_announce`).toBe(true);
      for (const tier of ["reactive", "coordinated", "transformative"]) {
        expect(ids.has(`crisis_${slug}_${tier}`), `missing crisis_${slug}_${tier}`).toBe(true);
      }
    }
  });
});
