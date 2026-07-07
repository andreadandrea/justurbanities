import type { Resources } from "../game/resources/ResourceManager";
import { neighbourhoodVitality, cityState, POSITIVE_RESOURCES } from "../game/resources/ResourceManager";
import type { I18n } from "../i18n/I18n";

/**
 * On-screen HUD for the collective resources and the derived Neighbourhood
 * Vitality (the "living fabric"). Accessible HTML overlay; updates only
 * when values change. Colour is never the only signal — every value is
 * shown as text, and the city state has a textual label.
 */
export class ResourceHud {
  private readonly panel: HTMLElement;
  private readonly values = new Map<string, HTMLElement>();
  private readonly names = new Map<string, HTMLElement>();
  private readonly vitalityTitle: HTMLElement;
  private readonly vitalityValue: HTMLElement;
  private readonly vitalityFill: HTMLElement;
  private readonly stateLabel: HTMLElement;
  private readonly liveRegion: HTMLElement;
  private lastState = "fragmented";
  private lastSignature = "";
  private lastResources: Partial<Resources> | null = null;

  constructor(root: HTMLElement, private readonly i18n: I18n) {
    this.panel = document.createElement("section");
    this.panel.className = "hud-resources";
    this.panel.setAttribute("aria-label", "Collective resources and neighbourhood vitality");

    const vitality = document.createElement("div");
    vitality.className = "hud-vitality";

    const vitalityHeader = document.createElement("div");
    vitalityHeader.className = "hud-vitality-header";
    this.vitalityTitle = document.createElement("span");
    this.stateLabel = document.createElement("span");
    this.stateLabel.className = "hud-state";
    this.vitalityValue = document.createElement("span");
    this.vitalityValue.className = "hud-vitality-value";
    vitalityHeader.append(this.vitalityTitle, this.stateLabel, this.vitalityValue);

    const track = document.createElement("div");
    track.className = "hud-vitality-track";
    track.setAttribute("role", "meter");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-label", "City vitality");
    this.vitalityFill = document.createElement("div");
    this.vitalityFill.className = "hud-vitality-fill";
    track.appendChild(this.vitalityFill);

    vitality.append(vitalityHeader, track);
    this.panel.appendChild(vitality);

    const list = document.createElement("ul");
    list.className = "hud-resource-list";
    for (const key of POSITIVE_RESOURCES) {
      const item = document.createElement("li");
      item.className = "hud-resource";
      const name = document.createElement("span");
      name.className = "hud-resource-name";
      const value = document.createElement("span");
      value.className = "hud-resource-value";
      value.textContent = "0";
      item.append(name, value);
      list.appendChild(item);
      this.values.set(key, value);
      this.names.set(key, name);
    }
    this.panel.appendChild(list);

    // a11y (task 9.2 open item): announce fabric changes to screen readers.
    this.liveRegion = document.createElement("p");
    this.liveRegion.className = "visually-hidden";
    this.liveRegion.setAttribute("aria-live", "polite");
    this.panel.appendChild(this.liveRegion);

    root.appendChild(this.panel);

    i18n.onChange(() => this.renderLabels());
    this.renderLabels();
  }

  private renderLabels(): void {
    this.vitalityTitle.textContent = this.i18n.t("ui.resources.vitality");
    this.stateLabel.textContent = this.i18n.t(`ui.state.${this.lastState}`);
    for (const key of POSITIVE_RESOURCES) {
      const el = this.names.get(key);
      if (el) el.textContent = this.i18n.t(`ui.resources.${key}`);
    }
  }

  update(resources: Resources): void {
    const vitality = neighbourhoodVitality(resources);
    const state = cityState(vitality);
    const signature = `${vitality}|${POSITIVE_RESOURCES.map((k) => resources[k]).join(",")}`;
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    this.announce(resources, state);
    this.lastState = state;
    this.lastResources = { ...resources };

    this.vitalityValue.textContent = String(vitality);
    this.vitalityFill.style.width = `${vitality}%`;
    this.stateLabel.textContent = this.i18n.t(`ui.state.${state}`);
    this.panel.dataset.state = state;

    const track = this.vitalityFill.parentElement;
    track?.setAttribute("aria-valuenow", String(vitality));

    for (const key of POSITIVE_RESOURCES) {
      const el = this.values.get(key);
      if (el) el.textContent = String(resources[key]);
    }
  }

  /** Politely announce deltas ("Trust +1") and city-state transitions. */
  private announce(resources: Resources, state: string): void {
    if (!this.lastResources) return; // first paint is not a change
    const parts: string[] = [];
    for (const key of POSITIVE_RESOURCES) {
      const delta = resources[key] - (this.lastResources[key] ?? 0);
      if (delta !== 0) {
        parts.push(`${this.i18n.t(`ui.resources.${key}`)} ${delta > 0 ? "+" : ""}${delta}`);
      }
    }
    if (state !== this.lastState) {
      parts.push(this.i18n.t(`ui.state.${state}`));
    }
    if (parts.length) this.liveRegion.textContent = parts.join(", ");
  }
}
