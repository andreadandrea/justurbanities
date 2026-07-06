import type { DialogueNode } from "../../types/Dialogue";
import type { DialogueManager } from "./DialogueManager";
import type { DialogueUI } from "../../ui/DialogueUI";

/**
 * Drives a whole dialogue through the overlay UI: shows each node,
 * forwards choices to the DialogueManager (which applies effects) and
 * notifies the scene so it can log progress events and autosave.
 */
export class DialogueRunner {
  constructor(
    private readonly ui: DialogueUI,
    private readonly manager: DialogueManager,
    private readonly onChoice: (dialogueId: string, choiceId: string) => Promise<void>,
    /** Variant-aware portrait lookup; voices (narrator, places) have none. */
    private readonly portraitFor?: (speakerId: string) => HTMLImageElement | undefined,
    /** Fired when a dialogue truly ends (not between nodes). */
    private readonly onEnded?: (dialogueId: string) => void
  ) {}

  run(dialogueId: string, speakerLabel: string): void {
    if (!this.manager.has(dialogueId)) {
      console.warn(`No dialogue defined: ${dialogueId}`);
      return;
    }
    this.show(dialogueId, speakerLabel, this.manager.start(dialogueId));
  }

  private show(dialogueId: string, speakerLabel: string, node: DialogueNode): void {
    const speakerId = this.manager.speakerOf(dialogueId);
    this.ui.show({
      speaker: speakerLabel,
      portrait: speakerId ? this.portraitFor?.(speakerId) : undefined,
      text: node.text,
      choices: node.choices.map((choice) => ({ id: choice.id, label: choice.label })),
      onChoice: (choice) => {
        void this.handleChoice(dialogueId, speakerLabel, choice.id);
      }
    });
  }

  private async handleChoice(dialogueId: string, speakerLabel: string, choiceId: string): Promise<void> {
    const result = this.manager.choose(choiceId);
    await this.onChoice(dialogueId, choiceId);
    if (!result.ended && result.node) {
      this.show(dialogueId, speakerLabel, result.node);
    } else if (result.ended) {
      this.onEnded?.(dialogueId);
    }
  }
}
