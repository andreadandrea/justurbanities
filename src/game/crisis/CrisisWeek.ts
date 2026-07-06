import type { GameState } from "../GameState";
import type { GameClock } from "../time/GameClock";
import type { CrisisManager } from "./CrisisManager";

/** Variable holding the absolute day on which Crisis Week began. */
export const CRISIS_WEEK_START_VAR = "crisisWeekStartDay";
/** Variable set to true when the ch.3 arc unlocks Crisis Week. */
export const CRISIS_WEEK_FLAG = "crisis_week_ready";
const ANNOUNCED_PREFIX = "crisisAnnounced_day";

const CRISIS_SLUG: Record<string, string> = {
  CRISIS_HEATWAVE: "heatwave",
  CRISIS_RUMOR: "rumor",
  CRISIS_OFFER: "offer",
  CRISIS_CLOSURE: "closure",
  CRISIS_FLOOD: "flood"
};

export type CrisisDialogueRunner = (dialogueId: string, speakerLabel: string) => void;

/**
 * Orchestrates Crisis Week over the GameClock: once the ch.3 flag arms the
 * week, it starts on the NEXT morning; each of the 5 days opens with the
 * crisis announcement and closes (end of day) with the tier resolution and
 * its outcome scene. Announcements/outcomes queue so they never overwrite
 * each other; one dialogue is shown per time step. All bookkeeping lives in
 * GameState.variables, so saves resume mid-week correctly.
 */
export class CrisisWeek {
  private readonly queue: string[] = [];

  constructor(
    private readonly state: GameState,
    private readonly clock: GameClock,
    private readonly manager: CrisisManager,
    private readonly runDialogue: CrisisDialogueRunner,
    private readonly isDialogueOpen: () => boolean
  ) {
    clock.on((event) => {
      if (event.type === "dayStarted") this.maybeStartWeek();
      if (event.type === "dayEnded") this.resolveEndedDay(event.day);
      if (event.type === "timeAdvanced") this.tick();
    });
  }

  /** Crisis Week day (1–5) for an absolute day, or undefined outside it. */
  weekDay(absoluteDay = this.state.day): number | undefined {
    const start = this.state.variables[CRISIS_WEEK_START_VAR];
    if (typeof start !== "number") return undefined;
    const day = absoluteDay - start + 1;
    return day >= 1 && day <= 5 ? day : undefined;
  }

  get completed(): boolean {
    const start = this.state.variables[CRISIS_WEEK_START_VAR];
    return typeof start === "number" && this.state.day - start + 1 > 5;
  }

  /** Called from the ch.3 arc (or the debug panel) to arm the week. */
  arm(): void {
    this.state.variables[CRISIS_WEEK_FLAG] = true;
  }

  private maybeStartWeek(): void {
    if (this.state.variables[CRISIS_WEEK_FLAG] !== true) return;
    if (this.state.variables[CRISIS_WEEK_START_VAR] !== undefined) return;
    this.state.variables[CRISIS_WEEK_START_VAR] = this.state.day;
  }

  private resolveEndedDay(endedDay: number): void {
    const day = this.weekDay(endedDay);
    if (day === undefined) return;
    const resolution = this.manager.resolveDay(day);
    if (!resolution) return;
    const slug = CRISIS_SLUG[resolution.crisisId];
    if (slug) this.queue.push(`crisis_${slug}_${resolution.tier}`);
  }

  private tick(): void {
    // Queue today's announcement once (also handles resuming a saved week).
    const day = this.weekDay();
    if (day !== undefined) {
      const announcedKey = `${ANNOUNCED_PREFIX}${day}`;
      const crisis = this.manager.crisisForDay(day);
      if (crisis && !this.manager.isResolved(crisis) && this.state.variables[announcedKey] !== true) {
        this.state.variables[announcedKey] = true;
        const slug = CRISIS_SLUG[crisis.id];
        if (slug) this.queue.push(`crisis_${slug}_announce`);
      }
    }
    this.flush();
  }

  /** Show at most one queued crisis scene per time step. */
  private flush(): void {
    if (this.queue.length === 0 || this.isDialogueOpen()) return;
    const dialogueId = this.queue.shift()!;
    this.runDialogue(dialogueId, "Eurbania");
  }
}
