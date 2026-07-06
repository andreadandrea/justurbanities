import { describe, expect, it } from "vitest";
import { interpolateDialogueText } from "../../src/game/dialogue/interpolate";
import dialoguesData from "../../src/data/dialogues.json";

describe("dialogue interpolation", () => {
  it("replaces {playerName}", () => {
    expect(interpolateDialogueText("Hi {playerName}!", { playerName: "Alex", pronoun: "they" })).toBe("Hi Alex!");
  });

  it("resolves pronoun tokens per pronoun set", () => {
    const text = "{They} said {them}? {Their} choice, {theirs} alone; {they} did it {themself}.";
    expect(interpolateDialogueText(text, { playerName: "A", pronoun: "she" })).toBe(
      "She said her? Her choice, hers alone; she did it herself."
    );
    expect(interpolateDialogueText(text, { playerName: "A", pronoun: "he" })).toBe(
      "He said him? His choice, his alone; he did it himself."
    );
    expect(interpolateDialogueText(text, { playerName: "A", pronoun: "they" })).toBe(
      "They said them? Their choice, theirs alone; they did it themself."
    );
  });

  it("leaves unknown tokens untouched so broken data stays visible", () => {
    expect(interpolateDialogueText("{somethingElse} {playerName}", { playerName: "Zed", pronoun: "he" })).toBe(
      "{somethingElse} Zed"
    );
  });

  it("the prologue-chapter opener greets the player by name", () => {
    const anna = dialoguesData.dialogues.find((d) => d.id === "anna_intro");
    const startText = (anna?.nodes as Record<string, { text: string }>).start.text;
    expect(startText).toContain("{playerName}");
    expect(interpolateDialogueText(startText, { playerName: "Nour", pronoun: "they" })).toContain("Nour");
  });
});
