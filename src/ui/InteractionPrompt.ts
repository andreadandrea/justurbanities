/**
 * Accessible HTML overlay for the proximity interaction prompt (spec §6.2).
 * Shows "Press E / Tap to talk" near the active interactable, positioned in
 * screen space (the scene converts world → screen via the camera). Tapping or
 * clicking the prompt fires the same interaction as the interact key.
 *
 * Mirrors the other HUD overlays (ResourceHud/TimeHud): the canvas draws the
 * world, this stays as accessible HTML on top.
 */
export class InteractionPrompt {
  private readonly button: HTMLButtonElement;
  private onActivate: (() => void) | null = null;

  constructor(root: HTMLElement, label = "Press E / Tap to talk") {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "interaction-prompt";
    this.button.hidden = true;
    this.button.setAttribute("aria-live", "polite");
    this.button.textContent = label;
    this.button.addEventListener("click", () => this.onActivate?.());
    root.appendChild(this.button);
  }

  /**
   * Position and show the prompt at a screen-space point (CSS pixels) and bind
   * the activation handler. Call every frame an active interactable exists.
   */
  show(screenX: number, screenY: number, onActivate: () => void): void {
    this.onActivate = onActivate;
    this.button.style.left = `${Math.round(screenX)}px`;
    this.button.style.top = `${Math.round(screenY)}px`;
    this.button.hidden = false;
  }

  /** Hide the prompt and drop the activation handler. */
  hide(): void {
    if (this.button.hidden && this.onActivate === null) return;
    this.button.hidden = true;
    this.onActivate = null;
  }
}
