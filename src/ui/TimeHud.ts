import type { GameClock } from "../game/time/GameClock";

/**
 * On-screen HUD for the day/time cycle. Accessible HTML overlay (the canvas
 * stays for the world). Shows "Day N • <part>" and a "Pass time" button that
 * advances the clock and triggers an autosave. Refreshes whenever the clock
 * changes (it subscribes), so passing time updates the label immediately.
 */
export class TimeHud {
  private readonly panel: HTMLElement;
  private readonly label: HTMLElement;

  constructor(
    root: HTMLElement,
    private readonly clock: GameClock,
    private readonly onAdvance: () => void
  ) {
    this.panel = document.createElement("section");
    this.panel.className = "hud-time";
    this.panel.setAttribute("aria-label", "Day and time of day");

    this.label = document.createElement("span");
    this.label.className = "hud-time-label";
    this.label.setAttribute("aria-live", "polite");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "hud-time-button";
    button.textContent = "Pass time";
    button.addEventListener("click", () => {
      this.clock.advance();
      this.onAdvance();
    });

    this.panel.append(this.label, button);
    root.appendChild(this.panel);

    this.refresh();
    this.clock.onChange(() => this.refresh());
  }

  /** Update the displayed "Day N • <part>" label from the clock. */
  refresh(): void {
    this.label.textContent = `Day ${this.clock.day} • ${this.clock.label()}`;
  }
}
