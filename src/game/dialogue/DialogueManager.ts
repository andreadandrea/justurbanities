import type { Dialogue, DialogueChoice, DialogueFile, DialogueNode } from "../../types/Dialogue";
import { EffectResolver } from "../effects/EffectResolver";

export class DialogueManager {
  private dialogues = new Map<string, Dialogue>();
  private activeDialogue: Dialogue | null = null;
  private activeNodeId: string | null = null;

  constructor(private readonly effectResolver: EffectResolver) {}

  load(file: DialogueFile): void {
    this.dialogues.clear();
    for (const dialogue of file.dialogues) {
      this.dialogues.set(dialogue.id, dialogue);
    }
  }

  start(dialogueId: string): DialogueNode {
    const dialogue = this.dialogues.get(dialogueId);
    if (!dialogue) throw new Error(`Dialogue not found: ${dialogueId}`);

    this.activeDialogue = dialogue;
    this.activeNodeId = dialogue.startNode;

    return this.getCurrentNode();
  }

  getCurrentNode(): DialogueNode {
    if (!this.activeDialogue || !this.activeNodeId) {
      throw new Error("No active dialogue.");
    }

    const node = this.activeDialogue.nodes[this.activeNodeId];
    if (!node) throw new Error(`Dialogue node not found: ${this.activeNodeId}`);

    this.effectResolver.applyAll(node.effects);
    return {
      ...node,
      choices: this.getAvailableChoices(node)
    };
  }

  choose(choiceId: string): { node?: DialogueNode; ended: boolean; choice: DialogueChoice } {
    const node = this.getCurrentNode();
    const choice = node.choices.find((item) => item.id === choiceId);

    if (!choice) throw new Error(`Choice not available: ${choiceId}`);

    this.effectResolver.applyAll(choice.effects);

    if (choice.end || !choice.next) {
      this.activeDialogue = null;
      this.activeNodeId = null;
      return { ended: true, choice };
    }

    this.activeNodeId = choice.next;
    return { node: this.getCurrentNode(), ended: false, choice };
  }

  private getAvailableChoices(node: DialogueNode): DialogueChoice[] {
    return node.choices.filter((choice) => this.effectResolver.checkAll(choice.conditions));
  }
}
