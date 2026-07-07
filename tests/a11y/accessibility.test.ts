import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FONT_SCALES } from "../../src/ui/OptionsPanel";

const css = readFileSync(join(__dirname, "../../src/styles/main.css"), "utf8");

describe("accessibility plumbing (task 9.2)", () => {
  it("every font-size in main.css scales through --font-scale", () => {
    // Raw px font sizes bypass the user's text-size setting.
    const raw = [...css.matchAll(/font-size:\s*[^;]+;/g)]
      .map((match) => match[0])
      .filter((rule) => rule.includes("px") && !rule.includes("var(--font-scale"));
    expect(raw, `unscaled font-size rules:\n${raw.join("\n")}`).toEqual([]);
  });

  it("defines the scale variable and the focus indicator", () => {
    expect(css).toContain("--font-scale: 1");
    expect(css).toContain(":focus-visible");
  });

  it("ships a high-contrast mode covering every panel surface", () => {
    for (const surface of [
      ".dialogue-root",
      ".assembly-panel",
      ".minigame-panel",
      ".logbook-panel",
      ".facilitator-panel"
    ]) {
      expect(css).toContain(`body.high-contrast ${surface}`);
    }
  });

  it("offers the documented text sizes", () => {
    expect(FONT_SCALES).toEqual([1, 1.25, 1.5]);
  });

  it("announces resource changes through a polite live region", () => {
    // Checklist open item: aria-live resource announcements.
    const hud = readFileSync(join(__dirname, "../../src/ui/ResourceHud.ts"), "utf8");
    expect(hud).toContain('setAttribute("aria-live", "polite")');
    expect(hud).toContain("visually-hidden");
    expect(css).toContain(".visually-hidden");
  });
});
