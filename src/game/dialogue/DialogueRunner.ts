import type { DialogueNode } from "../../types/Dialogue";
import type { DialogueManager } from "./DialogueManager";
import type { DialogueUI } from "../../ui/DialogueUI";
import { applyTemplate, type TemplateContext } from "./textTemplate";

/**
 * Drives a whole dialogue through the overlay UI: shows each node,
 * forwards choices to the DialogueManager (which applies effects) and
 * notifies the scene so it can log progress events and autosave.
 *
 * Dialogue text and choice labels are run through `applyTemplate` so writers
 * can address the player by `{name}` and use pronoun tokens. The context is
 * pulled lazily via `getTemplateContext` so the latest name/pronoun is used
 * without coupling the runner to global state.
 */
export class DialogueRunner {
  constructor(
    private readonly ui: DialogueUI,
    private readonly manager: DialogueManager,
    private readonly onChoice: (dialogueId: string, choiceId: string) => Promise<void>,
    private readonly getTemplateContext: () => TemplateContext
  ) {}

  run(dialogueId: string, speakerLabel: string): void {
    if (!this.manager.has(dialogueId)) {
      console.warn(`No dialogue defined: ${dialogueId}`);
      return;
    }
    this.show(dialogueId, speakerLabel, this.manager.start(dialogueId));
  }

  private show(dialogueId: string, speakerLabel: string, node: DialogueNode): void {
    const ctx = this.getTemplateContext();
    this.ui.show({
      speaker: speakerLabel,
      text: applyTemplate(node.text, ctx),
      choices: node.choices.map((choice) => ({ id: choice.id, label: applyTemplate(choice.label, ctx) })),
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
    }
  }
}
