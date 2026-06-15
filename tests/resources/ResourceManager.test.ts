import { describe, expect, it } from "vitest";
import { neighbourhoodVitality, cityState, cityFilter } from "../../src/game/resources/ResourceManager";
import { GameState } from "../../src/game/GameState";

const base = () => new GameState().resources;

describe("neighbourhoodVitality", () => {
  it("starts slightly below the midpoint on a fresh game", () => {
    // resources 0, fragmentation 5 -> 50 - 10 = 40
    expect(neighbourhoodVitality(base())).toBe(40);
  });

  it("rises as collective resources grow", () => {
    const r = { ...base(), trust: 10, care: 10, commons: 10, voice: 10, resilience: 10 };
    expect(neighbourhoodVitality(r)).toBe(90); // 50 + 50 - 10
  });

  it("falls as fragmentation grows", () => {
    const r = { ...base(), fragmentationGlobal: 30 };
    expect(neighbourhoodVitality(r)).toBe(0); // clamped: 50 - 60
  });

  it("clamps to the 0..100 range", () => {
    const high = { trust: 99, care: 99, commons: 99, voice: 99, resilience: 99, fragmentationGlobal: 0 };
    expect(neighbourhoodVitality(high)).toBe(100);
  });
});

describe("cityState", () => {
  it("maps vitality bands to the four states", () => {
    expect(cityState(10)).toBe("fragmented");
    expect(cityState(40)).toBe("awakening");
    expect(cityState(70)).toBe("connected");
    expect(cityState(95)).toBe("thriving");
  });

  it("a fresh game (vitality 40) reads as awakening, not fragmented", () => {
    expect(cityState(neighbourhoodVitality(base()))).toBe("awakening");
  });
});

describe("cityFilter", () => {
  it("desaturates when fragmented and is neutral when connected", () => {
    expect(cityFilter("fragmented")).toContain("saturate(0.4)");
    expect(cityFilter("connected")).toBe("saturate(1) brightness(1)");
  });
});
