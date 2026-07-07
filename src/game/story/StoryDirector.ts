import type { GameState } from "../GameState";

export type RunStoryDialogue = (dialogueId: string, speakerLabel: string) => void;

const ROUTE_DIALOGUE: Record<string, string> = {
  maya: "route_maya",
  samir: "route_samir",
  elena: "route_elena",
  luca: "route_luca",
  custom: "route_custom"
};

/** §4 — chapter 2 closes after 3 districts visited + Mission 1 completed. */
export const CH2_DISTRICTS_NEEDED = 3;

/** §5 — the chapter-3 interventions; "you choose 3–4 — not everything". */
export const CH3_INTERVENTIONS = ["M31", "M32", "M33", "M34", "E01", "N08"];
export const CH3_INTERVENTIONS_NEEDED = 3;

/**
 * Chapter-1 story flow (§3): after the prologue closes, the current
 * character's route runs; when the route completes, the first assembly
 * composes itself from the route outcomes (§3.6). Samir's route pauses at
 * the physical fence in the Crossroads — the world, not this director,
 * resumes it (BaseScene blockers). All state lives in variables.
 *
 * Chapter-2 closing (§4.6): once the exploration criterion is met (3
 * districts visited + "Listen Before Fixing" done), the ensemble scene at
 * the Center runs and opens chapter 3 ("Small repairs — we start there").
 */
export class StoryDirector {
  constructor(
    private readonly state: GameState,
    private readonly runDialogue: RunStoryDialogue,
    private readonly isDialogueOpen: () => boolean,
    private readonly hasDialogue: (dialogueId: string) => boolean,
    /** District scene ids whose first visit counts toward the ch.2 gate. */
    private readonly districtIds: string[] = [],
    /** Quest status lookup for the ch.3 gate (undefined disables it). */
    private readonly questStatus?: (questId: string) => string
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
      return;
    }

    if (
      vars.chapter2_unlocked === true &&
      vars.chapter2_closing_seen !== true &&
      this.chapter2GateMet() &&
      this.hasDialogue("chapter2_closing")
    ) {
      this.runDialogue("chapter2_closing", "Anna");
      return;
    }

    // §5.9 — the Fragmentation reacts once 3 interventions landed; Anna's
    // closing arms Crisis Week (the dialogue raises crisis_week_ready).
    if (
      vars.chapter3_unlocked === true &&
      vars.chapter3_closing_seen !== true &&
      this.chapter3GateMet() &&
      this.hasDialogue("chapter3_closing")
    ) {
      this.runDialogue("chapter3_closing", "Anna");
    }
  }

  /** §4 structure: "3 districts visited + Mission 1 completed is enough". */
  chapter2GateMet(): boolean {
    const vars = this.state.variables;
    if (vars.listenBeforeFixingDone !== true) return false;
    const visited = this.districtIds.filter((id) => vars[`${id}IntroSeen`] === true).length;
    return visited >= CH2_DISTRICTS_NEEDED;
  }

  /** §5 constraint: 3–4 interventions, not everything — 3 completed close the chapter. */
  chapter3GateMet(): boolean {
    if (!this.questStatus) return false;
    const completed = CH3_INTERVENTIONS.filter((questId) => this.questStatus?.(questId) === "completed").length;
    return completed >= CH3_INTERVENTIONS_NEEDED;
  }
}
