export class InputManager {
  readonly keys = new Set<string>();
  pointerTarget: { x: number; y: number } | null = null;
  justInteracted = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (event) => {
      // Typing in a form control (or pressing Enter on a focused button)
      // must never move the player or fire a scene interaction (task 9.2).
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea, button")) {
        return;
      }
      this.keys.add(event.key.toLowerCase());
      if (event.key === " " || event.key === "Enter") {
        this.justInteracted = true;
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });

    canvas.addEventListener("pointerdown", (event) => {
      const rect = canvas.getBoundingClientRect();
      this.pointerTarget = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      this.justInteracted = true;
    });
  }

  consumeInteract(): boolean {
    const value = this.justInteracted;
    this.justInteracted = false;
    return value;
  }

  axis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) x -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) x += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) y -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) y += 1;
    return { x, y };
  }
}
