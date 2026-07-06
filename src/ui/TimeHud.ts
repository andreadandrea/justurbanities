import type { GameClock } from "../game/time/GameClock";
import type { I18n } from "../i18n/I18n";

/**
 * On-screen day/time indicator plus the "Pass time" action (the REST verb):
 * time only moves when the player spends it. Accessible HTML overlay in the
 * same visual language as the resource HUD.
 */
export class TimeHud {
  private readonly panel: HTMLElement;
  private readonly label: HTMLElement;
  private readonly button: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    private readonly clock: GameClock,
    private readonly i18n: I18n,
    onPassTime: () => void
  ) {
    this.panel = document.createElement("section");
    this.panel.className = "hud-time";
    this.panel.setAttribute("aria-label", "Day and time of day");

    this.label = document.createElement("span");
    this.label.className = "hud-time-label";
    this.label.setAttribute("role", "status");

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "hud-time-pass";
    this.button.addEventListener("click", onPassTime);

    this.panel.append(this.label, this.button);
    root.appendChild(this.panel);

    clock.on(() => this.render());
    i18n.onChange(() => this.render());
    this.render();
  }

  private render(): void {
    const part = this.i18n.t(`ui.time.${this.clock.timePartName}`);
    this.label.textContent = `${this.i18n.t("ui.time.day")} ${this.clock.day} · ${part}`;
    this.panel.dataset.part = this.clock.timePartName;
    this.button.textContent = this.i18n.t("ui.time.passTime");
    this.button.title = this.i18n.t("ui.time.passTimeHint");
  }
}
