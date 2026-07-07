/**
 * Task 9.3 — playtest instrumentation for the M-E protocol. Everything
 * lands in progress_events, so the existing report/export/sync pipeline
 * carries the measurements for free:
 *  - node_timing: how long each dialogue node stayed on screen and which
 *    choice closed it (reading speed, hesitation points),
 *  - day_resources: the resource snapshot at every day end (pace of the
 *    collective curve, crisis-threshold tuning — Guida 02 §5).
 */

export type PlaytestLogger = (eventType: string, payload: Record<string, unknown>) => void;

export class PlaytestInstrumentation {
  private pending: { dialogueId: string; nodeId: string; shownAt: number } | null = null;

  constructor(
    private readonly log: PlaytestLogger,
    /** Injectable clock for tests. */
    private readonly nowMs: () => number = () => performance.now()
  ) {}

  /** A node reached the screen. An unclosed previous node was abandoned. */
  nodeEntered(dialogueId: string, nodeId: string): void {
    if (this.pending) {
      this.log("node_timing", {
        dialogueId: this.pending.dialogueId,
        nodeId: this.pending.nodeId,
        ms: Math.round(this.nowMs() - this.pending.shownAt),
        abandoned: true
      });
    }
    this.pending = { dialogueId, nodeId, shownAt: this.nowMs() };
  }

  /** The player picked a choice — the pending node closes with its timing. */
  choiceMade(dialogueId: string, nodeId: string, choiceId: string): void {
    if (!this.pending || this.pending.dialogueId !== dialogueId || this.pending.nodeId !== nodeId) return;
    this.log("node_timing", {
      dialogueId,
      nodeId,
      choiceId,
      ms: Math.round(this.nowMs() - this.pending.shownAt)
    });
    this.pending = null;
  }

  /** End of an in-game day: snapshot the collective curve. */
  dayEnded(day: number, resources: Record<string, number>): void {
    this.log("day_resources", { day, ...resources });
  }
}
