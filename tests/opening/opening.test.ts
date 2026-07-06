import { describe, expect, it } from "vitest";
import { playableSchema, prologueSchema, validateData } from "../../src/data/validation";
import { GameState } from "../../src/game/GameState";
import playableData from "../../src/data/playable.json";
import prologueData from "../../src/data/prologue.json";
import en from "../../src/locales/en.json";

describe("opening data", () => {
  it("playable.json is valid and exposes exactly one customizable character", () => {
    const parsed = validateData("playable.json", playableSchema, playableData);
    expect(parsed.playable.length).toBeGreaterThanOrEqual(2);
    expect(parsed.playable.filter((c) => c.customizable)).toHaveLength(1);
    expect(parsed.playable.find((c) => c.customizable)?.id).toBe("custom");
    // every preset has a fixed identity (name + pronoun)
    for (const character of parsed.playable.filter((c) => !c.customizable)) {
      expect(character.displayName.length).toBeGreaterThan(0);
      expect(["she", "he", "they"]).toContain(character.pronoun);
    }
  });

  it("taglines follow Character Bible canon", () => {
    const taglines = en.content.playable;
    // Maya is a shift worker and Zoe's mother — never "a student"
    expect(taglines.maya.tagline.toLowerCase()).not.toContain("student");
    expect(taglines.maya.tagline).toContain("Zoe");
    // Luca is a small business owner (economic route), not a care-at-home father
    expect(taglines.luca.tagline.toLowerCase()).toMatch(/business|shop/);
    expect(taglines.luca.tagline.toLowerCase()).not.toContain("father");
    // Elena represents the Town Hall (institutional route)
    expect(taglines.elena.tagline).toContain("Town Hall");
    // and every tagline field in the data file is an i18n key
    const parsed = validateData("playable.json", playableSchema, playableData);
    for (const c of parsed.playable) expect(c.tagline).toBe(`content.playable.${c.id}.tagline`);
  });

  it("prologue.json is valid and non-empty", () => {
    const parsed = validateData("prologue.json", prologueSchema, prologueData);
    expect(parsed.panels.length).toBeGreaterThan(0);
    expect(parsed.panels.every((panel) => panel.text.length > 0)).toBe(true);
  });
});

describe("GameState.startNewGame", () => {
  it("applies the opening choices and resets a clean run", () => {
    const state = new GameState();
    state.variables.leftover = true;
    state.resources.voice = 9;
    state.currentScene = "crossroads";

    state.startNewGame("custom", "Alex", "they");

    expect(state.currentCharacter).toBe("custom");
    expect(state.playerName).toBe("Alex");
    expect(state.playerPronoun).toBe("they");
    expect(state.started).toBe(true);
    expect(state.currentScene).toBe("community_center");
    expect(state.variables).toEqual({});
    expect(state.resources.voice).toBe(0);
    expect(state.resources.fragmentationGlobal).toBe(5);
  });

  it("round-trips name, pronoun and started through snapshot/restore", () => {
    const state = new GameState();
    state.startNewGame("maya", "Maya", "she");
    const snapshot = state.snapshot();

    const restored = new GameState();
    restored.restore(snapshot);
    expect(restored.playerName).toBe("Maya");
    expect(restored.playerPronoun).toBe("she");
    expect(restored.started).toBe(true);
  });

  it("restoring an older save (no opening fields) keeps it loadable", () => {
    const legacy = {
      currentScene: "community_center",
      currentCharacter: "maya",
      player: { x: 280, y: 440 },
      variables: {},
      resources: { trust: 0, care: 0, commons: 0, voice: 0, resilience: 0, fragmentationGlobal: 5 }
    } as unknown as ReturnType<GameState["snapshot"]>;

    const state = new GameState();
    state.restore(legacy);
    expect(state.playerPronoun).toBe("they");
    expect(state.started).toBe(true);
  });
});
