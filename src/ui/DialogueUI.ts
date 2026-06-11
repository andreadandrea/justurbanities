export type DialogueChoice = {
  id: string;
  label: string;
};

export class DialogueUI {
  constructor(private readonly root: HTMLElement) {}

  show(config: {
    speaker: string;
    text: string;
    choices: DialogueChoice[];
    onChoice: (choice: DialogueChoice) => void;
  }): void {
    this.root.hidden = false;
    this.root.innerHTML = "";

    const speaker = document.createElement("div");
    speaker.className = "dialogue-speaker";
    speaker.textContent = config.speaker;

    const text = document.createElement("div");
    text.className = "dialogue-text";
    text.textContent = config.text;

    const choices = document.createElement("div");
    choices.className = "dialogue-choices";

    for (const choice of config.choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        config.onChoice(choice);
        this.hide();
      });
      choices.appendChild(button);
    }

    this.root.append(speaker, text, choices);
  }

  hide(): void {
    this.root.hidden = true;
    this.root.innerHTML = "";
  }
}
