import type { Dialogue, DialogueChoice, DialogueFile, DialogueNode } from "../../types/Dialogue";
import { EffectResolver } from "../effects/EffectResolver";

/** Task 9.3 — optional hooks so playtests can time every node. */
export type DialogueInstrumentation = {
  nodeEntered(dialogueId: string, nodeId: string): void;
  choiceMade(dialogueId: string, nodeId: string, choiceId: string): void;
};

export class DialogueManager {
  private dialogues = new Map<string, Dialogue>();
  private activeDialogue: Dialogue | null = null;
  private activeNodeId: string | null = null;
  private instrumentation?: DialogueInstrumentation;

  constructor(private readonly effectResolver: EffectResolver) {}

  setInstrumentation(instrumentation: DialogueInstrumentation): void {
    this.instrumentation = instrumentation;
  }

  load(file: DialogueFile): void {
    this.dialogues.clear();
    for (const dialogue of file.dialogues) {
      this.dialogues.set(dialogue.id, dialogue);
    }
  }

  has(dialogueId: string): boolean {
    return this.dialogues.has(dialogueId);
  }

  speakerOf(dialogueId: string): string | undefined {
    return this.dialogues.get(dialogueId)?.speakerId;
  }

  start(dialogueId: string): DialogueNode {
    const dialogue = this.dialogues.get(dialogueId);
    if (!dialogue) throw new Error(`Dialogue not found: ${dialogueId}`);

    this.activeDialogue = dialogue;
    this.activeNodeId = dialogue.startNode;
    this.applyNodeEntryEffects();
    this.instrumentation?.nodeEntered(dialogue.id, dialogue.startNode);

    return this.getCurrentNode();
  }

  // Read-only view of the current node: entry effects are applied once,
  // when the node is entered (start/choose), never on repeated reads.
  getCurrentNode(): DialogueNode {
    if (!this.activeDialogue || !this.activeNodeId) {
      throw new Error("No active dialogue.");
    }

    const node = this.activeDialogue.nodes[this.activeNodeId];
    if (!node) throw new Error(`Dialogue node not found: ${this.activeNodeId}`);

    return {
      ...node,
      choices: this.getAvailableChoices(node)
    };
  }

  choose(choiceId: string): { node?: DialogueNode; ended: boolean; choice: DialogueChoice } {
    const node = this.getCurrentNode();
    const choice = node.choices.find((item) => item.id === choiceId);

    if (!choice) throw new Error(`Choice not available: ${choiceId}`);

    const dialogueId = this.activeDialogue!.id;
    this.instrumentation?.choiceMade(dialogueId, this.activeNodeId!, choiceId);
    this.effectResolver.applyAll(choice.effects);

    if (choice.end || !choice.next) {
      this.activeDialogue = null;
      this.activeNodeId = null;
      return { ended: true, choice };
    }

    this.activeNodeId = choice.next;
    this.applyNodeEntryEffects();
    this.instrumentation?.nodeEntered(dialogueId, this.activeNodeId);
    return { node: this.getCurrentNode(), ended: false, choice };
  }

  private applyNodeEntryEffects(): void {
    if (!this.activeDialogue || !this.activeNodeId) return;
    const node = this.activeDialogue.nodes[this.activeNodeId];
    this.effectResolver.applyAll(node?.effects);
  }

  private getAvailableChoices(node: DialogueNode): DialogueChoice[] {
    return node.choices.filter((choice) => this.effectResolver.checkAll(choice.conditions));
  }
}
