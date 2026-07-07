import type {
  AssemblyCommitment,
  AssemblyConflict,
  AssemblyFile,
  AssemblyMeasure,
  AssemblyPhase,
  AssemblyPlanState,
  AssemblyStory,
} from "../../types/Assembly";
import type { Condition, Effect } from "../../types/Dialogue";
import type { GameState } from "../GameState";

/** Save variable holding the JSON-serialized assembly state (AC task 7.1). */
export const ASSEMBLY_STATE_VAR = "assemblyState";
/** Set by ch.4 closing content (or the debug panel) to open the assembly. */
export const ASSEMBLY_READY_FLAG = "assembly_ready";

export type AssemblyProgressLogger = (
  eventType: string,
  payload: Record<string, unknown>,
) => void;

export type AttendanceView = {
  present: string[];
  absent: Array<{ npcId: string; group: string }>;
};

function freshState(): AssemblyPlanState {
  return {
    version: 1,
    phase: "preparation",
    stories: [],
    data: [],
    invited: [],
    missedSlots: [],
    present: [],
    absent: [],
    played: [],
    heart: 0,
    numbers: 0,
    conflicts: {},
    evasions: 0,
    measures: {},
    overpromise: false,
  };
}

/**
 * Chapter 5 — Assembly of Just Futures (§7). A five-phase state machine:
 * preparation → who is in the room → stories → conflict table → plan →
 * commitment. Everything is data-driven (assembly.json) and the whole state
 * serializes into GameState.variables, so a save resumes mid-assembly and
 * the final plan travels with the save (AC 7.1). Player-facing mutations
 * return false instead of throwing so the UI can simply deny them.
 */
export class AssemblyEngine {
  private file!: AssemblyFile;
  private state_: AssemblyPlanState = freshState();
  private started = false;

  constructor(
    private readonly game: GameState,
    private readonly check: (conditions: Condition[]) => boolean,
    private readonly applyEffects: (effects: Effect[]) => void,
    private readonly logProgress?: AssemblyProgressLogger,
  ) {}

  load(file: AssemblyFile): void {
    this.file = file;
    this.restoreFromSave();
  }

  /** Re-read the save variable (call after GameState.restore()). */
  restoreFromSave(): void {
    const raw = this.game.variables[ASSEMBLY_STATE_VAR];
    if (typeof raw === "string") {
      this.state_ = JSON.parse(raw) as AssemblyPlanState;
      this.started = true;
    } else {
      this.state_ = freshState();
      this.started = false;
    }
  }

  get phase(): AssemblyPhase {
    return this.state_.phase;
  }

  get hasStarted(): boolean {
    return this.started;
  }

  /** The assembly opens once ch.4 content (or debug) raises the flag. */
  get isReady(): boolean {
    return this.game.variables[ASSEMBLY_READY_FLAG] === true || this.started;
  }

  /** Read-only view of the running (or finished) plan state. */
  get plan(): AssemblyPlanState {
    return this.state_;
  }

  begin(): boolean {
    if (this.started) return false;
    if (!this.isReady) return false;
    this.state_ = freshState();
    this.started = true;
    this.persist();
    return true;
  }

  // ---------- §7.1 preparation ----------

  availableStories(kind: "story" | "data"): AssemblyStory[] {
    return this.file.stories.filter(
      (story) => story.kind === kind && this.check(story.requires),
    );
  }

  /** Attendees the player may spend an invite slot on. */
  invitable(): string[] {
    return this.file.attendance
      .filter(
        (attendee) =>
          attendee.invitedConditions && !this.check(attendee.conditions),
      )
      .map((attendee) => attendee.npcId);
  }

  selectStories(ids: string[]): boolean {
    return this.setSelection(
      "stories",
      ids,
      this.file.tuning.storySlots,
      this.availableStories("story"),
    );
  }

  selectData(ids: string[]): boolean {
    return this.setSelection(
      "data",
      ids,
      this.file.tuning.dataSlots,
      this.availableStories("data"),
    );
  }

  selectInvites(ids: string[]): boolean {
    if (this.state_.phase !== "preparation") return false;
    if (ids.length > this.file.tuning.inviteSlots) return false;
    const invitable = new Set(this.invitable());
    if (!ids.every((id) => invitable.has(id))) return false;
    this.state_.invited = [...ids];
    this.persist();
    return true;
  }

  private setSelection(
    field: "stories" | "data",
    ids: string[],
    slots: number,
    available: AssemblyStory[],
  ): boolean {
    if (this.state_.phase !== "preparation") return false;
    if (ids.length > slots || new Set(ids).size !== ids.length) return false;
    const availableIds = new Set(available.map((story) => story.id));
    if (!ids.every((id) => availableIds.has(id))) return false;
    this.state_[field] = [...ids];
    this.persist();
    return true;
  }

  // ---------- §7.2 who is in the room ----------

  enterRoom(): boolean {
    if (this.state_.phase !== "preparation") return false;
    const tuning = this.file.tuning;
    // Every empty preparation slot becomes a "what was missed" report entry.
    this.state_.missedSlots = [
      ...Array<string>(tuning.storySlots - this.state_.stories.length).fill(
        "story",
      ),
      ...Array<string>(tuning.dataSlots - this.state_.data.length).fill("data"),
      ...Array<string>(tuning.inviteSlots - this.state_.invited.length).fill(
        "invite",
      ),
    ];

    const invited = new Set(this.state_.invited);
    this.state_.present = [];
    this.state_.absent = [];
    for (const attendee of this.file.attendance) {
      const comes =
        this.check(attendee.conditions) ||
        (invited.has(attendee.npcId) &&
          attendee.invitedConditions !== undefined &&
          this.check(attendee.invitedConditions));
      if (comes) this.state_.present.push(attendee.npcId);
      else
        this.state_.absent.push({
          npcId: attendee.npcId,
          group: attendee.group,
        });
    }
    this.state_.phase = "room";
    this.persist();
    this.logProgress?.("assembly_room", {
      present: this.state_.present,
      absent: this.state_.absent.map((entry) => entry.npcId),
    });
    return true;
  }

  attendance(): AttendanceView {
    return {
      present: [...this.state_.present],
      absent: this.state_.absent.map((entry) => ({ ...entry })),
    };
  }

  /** Groups with every member absent — feeds ending 9.4. */
  absentGroups(): string[] {
    const presentGroups = new Set(
      this.file.attendance
        .filter((a) => this.state_.present.includes(a.npcId))
        .map((a) => a.group),
    );
    return [...new Set(this.state_.absent.map((entry) => entry.group))].filter(
      (group) => !presentGroups.has(group),
    );
  }

  proceedToStories(): boolean {
    if (this.state_.phase !== "room") return false;
    this.state_.phase = "stories";
    this.persist();
    return true;
  }

  // ---------- §7.3 what did we learn ----------

  /** Stories/data chosen in preparation and not yet read aloud. */
  unplayed(): string[] {
    return [...this.state_.stories, ...this.state_.data].filter(
      (id) => !this.state_.played.includes(id),
    );
  }

  playStory(id: string): boolean {
    if (this.state_.phase !== "stories") return false;
    if (!this.unplayed().includes(id)) return false;
    this.state_.played.push(id);
    const story = this.file.stories.find((candidate) => candidate.id === id);
    if (story?.kind === "story") this.state_.heart += 1;
    else this.state_.numbers += 1;
    this.persist();
    return true;
  }

  /** Too much heart or too many numbers skews the room (§7.3). */
  tone(): "heart" | "cold" | "balanced" {
    const gap = this.file.tuning.toneGap;
    if (this.state_.heart > this.state_.numbers + gap) return "heart";
    if (this.state_.numbers > this.state_.heart + gap) return "cold";
    return "balanced";
  }

  proceedToConflicts(): boolean {
    if (this.state_.phase !== "stories") return false;
    if (this.unplayed().length > 0) return false;
    this.state_.phase = "conflicts";
    this.persist();
    return true;
  }

  // ---------- §7.4 conflict table ----------

  activeConflicts(): AssemblyConflict[] {
    return this.file.conflicts.filter((conflict) =>
      this.check(conflict.conditions),
    );
  }

  canAfford(cost: Record<string, number> = {}): boolean {
    const resources = this.game.resources as unknown as Record<string, number>;
    return Object.entries(cost).every(
      ([key, value]) => (resources[key] ?? 0) >= value,
    );
  }

  choosePosition(conflictId: string, positionId: string): boolean {
    if (this.state_.phase !== "conflicts") return false;
    if (this.state_.conflicts[conflictId] !== undefined) return false;
    const conflict = this.activeConflicts().find(
      (candidate) => candidate.id === conflictId,
    );
    const position = conflict?.positions.find(
      (candidate) => candidate.id === positionId,
    );
    if (!conflict || !position) return false;

    if (position.kind === "synthesis") {
      // A successful synthesis requires resources — paid on the spot (§7.4).
      if (!this.canAfford(position.cost)) return false;
      this.spend(position.cost ?? {});
    }
    if (position.kind === "evasion") this.state_.evasions += 1;

    this.state_.conflicts[conflictId] = positionId;
    this.applyEffects(position.effects ?? []);
    this.persist();
    this.logProgress?.("assembly_conflict", {
      conflictId,
      positionId,
      kind: position.kind,
    });
    return true;
  }

  proceedToPlan(): boolean {
    if (this.state_.phase !== "conflicts") return false;
    if (
      this.activeConflicts().some(
        (conflict) => this.state_.conflicts[conflict.id] === undefined,
      )
    )
      return false;
    this.state_.phase = "plan";
    this.persist();
    return true;
  }

  // ---------- §7.5 build the plan ----------

  measures(): AssemblyMeasure[] {
    return this.file.measures;
  }

  categories(): string[] {
    return this.file.categories;
  }

  /** Base cost minus the story discount when a played story backs the measure. */
  measureCost(measureId: string): Record<string, number> {
    const measure = this.file.measures.find(
      (candidate) => candidate.id === measureId,
    );
    if (!measure) return {};
    const backed = this.file.stories.some(
      (story) =>
        this.state_.played.includes(story.id) &&
        story.measures.includes(measureId),
    );
    if (!backed) return { ...measure.cost };
    const discounted: Record<string, number> = {};
    for (const [key, value] of Object.entries(measure.cost)) {
      discounted[key] = Math.max(0, value - this.file.tuning.storyDiscount);
    }
    return discounted;
  }

  addMeasure(measureId: string): boolean {
    if (this.state_.phase !== "plan") return false;
    if (this.state_.measures[measureId] !== undefined) return false;
    if (!this.file.measures.some((measure) => measure.id === measureId))
      return false;
    this.state_.measures[measureId] = null;
    this.persist();
    return true;
  }

  removeMeasure(measureId: string): boolean {
    if (this.state_.phase !== "plan") return false;
    if (this.state_.measures[measureId] === undefined) return false;
    delete this.state_.measures[measureId];
    this.persist();
    return true;
  }

  /** Distinct categories in the plan — coverage counts, not quantity (§7.5). */
  coverage(): number {
    const categories = new Set(
      Object.keys(this.state_.measures).map(
        (measureId) =>
          this.file.measures.find((measure) => measure.id === measureId)
            ?.category ?? "",
      ),
    );
    categories.delete("");
    return categories.size;
  }

  proceedToCommitment(): boolean {
    if (this.state_.phase !== "plan") return false;
    if (Object.keys(this.state_.measures).length === 0) return false;
    this.state_.phase = "commitment";
    this.persist();
    return true;
  }

  // ---------- §7.6 commitment ----------

  /** Valid owners: everyone in the room plus the playable at the table. */
  owners(): string[] {
    return [...this.state_.present, this.game.currentCharacter];
  }

  deadlineOptions(): number[] {
    return [...this.file.tuning.deadlineOptions];
  }

  verificationOptions(): string[] {
    return [...this.file.tuning.verificationOptions];
  }

  commit(
    measureId: string,
    commitment: { owner: string; deadlineDays: number; verification: string },
  ): boolean {
    if (this.state_.phase !== "commitment") return false;
    if (this.state_.measures[measureId] === undefined) return false;
    if (!this.owners().includes(commitment.owner)) return false;
    if (!this.file.tuning.deadlineOptions.includes(commitment.deadlineDays))
      return false;
    if (!this.file.tuning.verificationOptions.includes(commitment.verification))
      return false;
    this.state_.measures[measureId] = {
      owner: commitment.owner,
      deadlineDay: this.game.day + commitment.deadlineDays,
      verification: commitment.verification,
    } satisfies AssemblyCommitment;
    this.persist();
    return true;
  }

  uncommitted(): string[] {
    return Object.entries(this.state_.measures)
      .filter(([, commitment]) => commitment === null)
      .map(([measureId]) => measureId);
  }

  /**
   * Sign the pact: every measure needs a name, a date and a review. The total
   * (discounted) cost is paid; promising beyond the available resources sets
   * `overpromise` — Elena's lesson applies to everyone (§7.6).
   */
  finalize(): boolean {
    if (this.state_.phase !== "commitment") return false;
    if (this.uncommitted().length > 0) return false;

    const total: Record<string, number> = {};
    for (const measureId of Object.keys(this.state_.measures)) {
      for (const [key, value] of Object.entries(this.measureCost(measureId))) {
        total[key] = (total[key] ?? 0) + value;
      }
    }
    const resources = this.game.resources as unknown as Record<string, number>;
    this.state_.overpromise = Object.entries(total).some(
      ([key, value]) => value > (resources[key] ?? 0),
    );
    this.spend(total);

    this.state_.phase = "done";
    this.state_.finalizedOnDay = this.game.day;

    // Scalar summaries so endings (§9) and dialogue conditions read them
    // without parsing JSON.
    this.game.variables.assembly_complete = true;
    this.game.variables.overpromise = this.state_.overpromise;
    this.game.variables.assemblyCoverage = this.coverage();
    this.game.variables.assemblyAbsentGroups = this.absentGroups().length;
    this.game.variables.assemblyEvasions = this.state_.evasions;
    this.game.variables.assemblyTone = this.tone();
    this.persist();

    this.logProgress?.("assembly_plan", {
      coverage: this.coverage(),
      overpromise: this.state_.overpromise,
      evasions: this.state_.evasions,
      tone: this.tone(),
      missedSlots: this.state_.missedSlots,
      absentGroups: this.absentGroups(),
      measures: Object.entries(this.state_.measures).map(
        ([measureId, commitment]) => ({
          measureId,
          ...commitment,
        }),
      ),
    });
    return true;
  }

  // ---------- internals ----------

  /** Spend clamps at zero: the plan can promise more than the city has. */
  private spend(cost: Record<string, number>): void {
    const resources = this.game.resources as unknown as Record<string, number>;
    for (const [key, value] of Object.entries(cost)) {
      resources[key] = Math.max(0, (resources[key] ?? 0) - value);
    }
  }

  private persist(): void {
    this.game.variables[ASSEMBLY_STATE_VAR] = JSON.stringify(this.state_);
  }
}
