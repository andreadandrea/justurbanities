import { describe, expect, it } from "vitest";
import { applyTemplate } from "../../src/game/dialogue/textTemplate";

describe("applyTemplate", () => {
  it("substitutes the player's name", () => {
    expect(applyTemplate("Hello, {name}!", { name: "Maya", pronoun: "they" })).toBe("Hello, Maya!");
  });

  it("falls back to a neutral default when the name is empty", () => {
    expect(applyTemplate("Hello, {name}.", { name: "", pronoun: "they" })).toBe("Hello, you.");
    expect(applyTemplate("Hello, {name}.", { name: "   ", pronoun: "they" })).toBe("Hello, you.");
    expect(applyTemplate("{Name} arrives.", { name: "", pronoun: "they" })).toBe("You arrives.");
  });

  it("capitalizes {Name} when a name is present", () => {
    expect(applyTemplate("{Name} arrives.", { name: "maya", pronoun: "they" })).toBe("Maya arrives.");
  });

  it("resolves all pronoun forms for she", () => {
    const text = "{they} took {their} bag; it is {theirs}. Give it to {them}. {They} fixed it {themself}.";
    expect(applyTemplate(text, { name: "Ada", pronoun: "she" })).toBe(
      "she took her bag; it is hers. Give it to her. She fixed it herself."
    );
  });

  it("resolves all pronoun forms for he", () => {
    const text = "{they} took {their} bag; it is {theirs}. Give it to {them}. {They} fixed it {themself}.";
    expect(applyTemplate(text, { name: "Ben", pronoun: "he" })).toBe(
      "he took his bag; it is his. Give it to him. He fixed it himself."
    );
  });

  it("resolves all pronoun forms for they", () => {
    const text = "{they} took {their} bag; it is {theirs}. Give it to {them}. {They} fixed it {themself}.";
    expect(applyTemplate(text, { name: "Sam", pronoun: "they" })).toBe(
      "they took their bag; it is theirs. Give it to them. They fixed it themselves."
    );
  });

  it("supports capitalized pronoun variants", () => {
    expect(applyTemplate("{They} said {Their} piece. {Them}.", { name: "Ada", pronoun: "she" })).toBe(
      "She said Her piece. Her."
    );
  });

  it("leaves unknown tokens untouched", () => {
    expect(applyTemplate("Keep {unknown} and {name}.", { name: "Ada", pronoun: "they" })).toBe(
      "Keep {unknown} and Ada."
    );
    expect(applyTemplate("interface Foo {bar}", { name: "Ada", pronoun: "they" })).toBe("interface Foo {bar}");
  });

  it("leaves text without tokens unchanged", () => {
    expect(applyTemplate("No tokens here.", { name: "Ada", pronoun: "she" })).toBe("No tokens here.");
  });
});
