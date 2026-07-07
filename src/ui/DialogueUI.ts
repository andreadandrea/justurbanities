import { interpolateDialogueText, type InterpolationContext } from "../game/dialogue/interpolate";
import type { I18n } from "../i18n/I18n";

export type DialogueChoice = {
  id: string;
  label: string;
};

export class DialogueUI {
  constructor(
    private readonly root: HTMLElement,
    /** Resolves content.* keys coming from the data files. */
    private readonly i18n?: I18n,
    /** Supplies the current player identity for {playerName}/{they} tokens. */
    private readonly interpolation?: () => InterpolationContext
  ) {
    // Keyboard-only play (task 9.2): 1–9 picks the matching choice.
    window.addEventListener("keydown", (event) => {
      if (this.root.hidden) return;
      const index = Number.parseInt(event.key, 10) - 1;
      if (Number.isNaN(index) || index < 0) return;
      const buttons = this.root.querySelectorAll<HTMLButtonElement>(".dialogue-choices button");
      buttons[index]?.click();
    });
  }

  private resolve(text: string): string {
    const localized = this.i18n ? this.i18n.t(text) : text;
    return this.interpolation ? interpolateDialogueText(localized, this.interpolation()) : localized;
  }

  show(config: {
    speaker: string;
    text: string;
    choices: DialogueChoice[];
    onChoice: (choice: DialogueChoice) => void;
    portrait?: HTMLImageElement;
  }): void {
    this.root.hidden = false;
    this.root.innerHTML = "";

    if (config.portrait) {
      const portrait = document.createElement("img");
      portrait.className = "dialogue-portrait";
      portrait.alt = "";
      portrait.src = config.portrait.src;
      this.root.appendChild(portrait);
    }

    const speaker = document.createElement("div");
    speaker.className = "dialogue-speaker";
    speaker.textContent = config.speaker;

    const text = document.createElement("div");
    text.className = "dialogue-text";
    text.textContent = this.resolve(config.text);

    const choices = document.createElement("div");
    choices.className = "dialogue-choices";

    config.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      // The numeric prefix doubles as the keyboard shortcut (task 9.2).
      button.textContent = `${index + 1}. ${this.resolve(choice.label)}`;
      button.addEventListener("click", () => {
        config.onChoice(choice);
        this.hide();
      });
      choices.appendChild(button);
    });

    this.root.append(speaker, text, choices);
    // Tab/Enter work immediately — focus starts on the first choice.
    choices.querySelector("button")?.focus();
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  hide(): void {
    this.root.hidden = true;
    this.root.innerHTML = "";
  }
}
