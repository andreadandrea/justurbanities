import type { GameClock } from "../game/time/GameClock";
import { TIME_PARTS } from "../game/time/GameClock";

const PART_LABEL: Record<(typeof TIME_PARTS)[number], string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening"
};

/**
 * On-screen day/time indicator plus the "Pass time" action (the REST verb):
 * time only moves when the player spends it. Accessible HTML overlay in the
 * same visual language as the resource HUD.
 */
export class TimeHud {
  private readonly panel: HTMLElement;
  private readonly label: HTMLElement;

  constructor(
    root: HTMLElement,
    private readonly clock: GameClock,
    onPassTime: () => void
  ) {
    this.panel = document.createElement("section");
    this.panel.className = "hud-time";
    this.panel.setAttribute("aria-label", "Day and time of day");

    this.label = document.createElement("span");
    this.label.className = "hud-time-label";
    this.label.setAttribute("role", "status");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "hud-time-pass";
    button.textContent = "Pass time";
    button.title = "Let time pass to the next part of the day";
    button.addEventListener("click", onPassTime);

    this.panel.append(this.label, button);
    root.appendChild(this.panel);

    clock.on(() => this.render());
    this.render();
  }

  private render(): void {
    this.label.textContent = `Day ${this.clock.day} · ${PART_LABEL[this.clock.timePartName]}`;
    this.panel.dataset.part = this.clock.timePartName;
  }
}
