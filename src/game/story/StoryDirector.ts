import type { GameState } from "../GameState";

export type RunStoryDialogue = (dialogueId: string, speakerLabel: string) => void;

const ROUTE_DIALOGUE: Record<string, string> = {
  maya: "route_maya",
  samir: "route_samir",
  elena: "route_elena",
  luca: "route_luca",
  custom: "route_custom"
};

/**
 * Chapter-1 story flow (§3): after the prologue closes, the current
 * character's route runs; when the route completes, the first assembly
 * composes itself from the route outcomes (§3.6). Samir's route pauses at
 * the physical fence in the Crossroads — the world, not this director,
 * resumes it (BaseScene blockers). All state lives in variables.
 */
export class StoryDirector {
  constructor(
    private readonly state: GameState,
    private readonly runDialogue: RunStoryDialogue,
    private readonly isDialogueOpen: () => boolean,
    private readonly hasDialogue: (dialogueId: string) => boolean
  ) {}

  /** Call whenever a dialogue ends or the game (re)enters a scene. */
  check(): void {
    if (this.isDialogueOpen()) return;
    const vars = this.state.variables;
    if (vars.prologue_complete !== true) return;

    if (vars.route_complete !== true) {
      // Samir mid-route: the fence in the Crossroads resumes the story.
      if (vars.samir_route_stage === "barrier") return;
      const dialogueId = ROUTE_DIALOGUE[this.state.currentCharacter];
      if (dialogueId && this.hasDialogue(dialogueId) && vars.route_stage === undefined) {
        vars.route_stage = "running";
        this.runDialogue(dialogueId, this.state.playerName || this.state.currentCharacter);
      }
      return;
    }

    if (vars.assembly_v1_seen !== true && this.hasDialogue("assembly_v1")) {
      this.runDialogue("assembly_v1", "Anna");
    }
  }
}
