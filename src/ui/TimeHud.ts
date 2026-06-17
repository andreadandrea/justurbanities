import type { GameClock, TimePart } from "../game/time/GameClock";

// Decorative only — the textual label is always the real signal.
const PART_GLYPH: Record<TimePart, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌆"
};

/**
 * Day / time indicator + a "Pass time" action (Gameplay Loop pillar 2).
 * Accessible HTML overlay: the label is read as text, the icon is purely
 * decorative. Advancing time changes who is on the street (see NpcScheduler).
 */
export class TimeHud {
  private readonly panel: HTMLElement;
  private readonly glyph: HTMLElement;
  private readonly label: HTMLElement;

  constructor(root: HTMLElement, private readonly clock: GameClock, private readonly onAdvance: () => void) {
    this.panel = document.createElement("section");
    this.panel.className = "hud-time";
    this.panel.setAttribute("aria-label", "Day and time of day");

    const readout = document.createElement("div");
    readout.className = "hud-time-readout";
    this.glyph = document.createElement("span");
    this.glyph.className = "hud-time-glyph";
    this.glyph.setAttribute("aria-hidden", "true");
    this.label = document.createElement("span");
    this.label.className = "hud-time-label";
    readout.append(this.glyph, this.label);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "hud-time-advance";
    button.textContent = "Pass time";
    button.title = "Advance to the next part of the day";
    button.addEventListener("click", () => this.onAdvance());

    this.panel.append(readout, button);
    root.appendChild(this.panel);

    this.clock.onChange(() => this.render());
    this.render();
  }

  private render(): void {
    this.glyph.textContent = PART_GLYPH[this.clock.partName];
    this.label.textContent = this.clock.label();
    this.panel.dataset.part = this.clock.partName;
  }
}
