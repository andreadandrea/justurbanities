import type { AssemblyEngine } from "../game/assembly/AssemblyEngine";
import type { I18n } from "../i18n/I18n";

type AssemblyPanelDeps = {
  root: HTMLElement;
  engine: AssemblyEngine;
  i18n: I18n;
  /** Display name for an NPC or playable id (characters.json). */
  npcName: (id: string) => string;
  /** Persist the save after meaningful steps (the plan lives in variables). */
  saveNow: () => void;
};

/**
 * Chapter 5 UI (🏛): drives the AssemblyEngine through its five phases.
 * Pure DOM like the other panels; every string is an i18n key. The panel
 * only issues engine calls — all rules live in AssemblyEngine.
 */
export class AssemblyPanel {
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;

  constructor(private readonly deps: AssemblyPanelDeps) {
    const { root, i18n } = deps;

    this.panel = document.createElement("aside");
    this.panel.className = "assembly-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Assembly");

    const title = document.createElement("h3");
    title.textContent = i18n.t("ui.assembly.title");
    this.body = document.createElement("div");
    this.body.className = "assembly-body";
    this.panel.append(title, this.body);
    root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "assembly-toggle";
    toggle.textContent = i18n.t("ui.assembly.toggle");
    toggle.title = i18n.t("ui.assembly.hint");
    toggle.addEventListener("click", () => {
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden) this.render();
    });
    root.appendChild(toggle);

    i18n.onChange(() => {
      title.textContent = i18n.t("ui.assembly.title");
      toggle.textContent = i18n.t("ui.assembly.toggle");
      toggle.title = i18n.t("ui.assembly.hint");
      if (!this.panel.hidden) this.render();
    });
  }

  render(): void {
    const { engine } = this.deps;
    this.body.replaceChildren();
    if (!engine.hasStarted) return this.renderIntro();
    switch (engine.phase) {
      case "preparation":
        return this.renderPreparation();
      case "room":
        return this.renderRoom();
      case "stories":
        return this.renderStories();
      case "conflicts":
        return this.renderConflicts();
      case "plan":
        return this.renderPlan();
      case "commitment":
        return this.renderCommitment();
      case "done":
        return this.renderDone();
    }
  }

  // ---------- phases ----------

  private renderIntro(): void {
    const { engine, i18n } = this.deps;
    this.paragraph(
      engine.isReady ? "content.assembly.intro" : "ui.assembly.notReady",
    );
    if (!engine.isReady) return;
    this.actionButton(i18n.t("ui.assembly.begin"), () => engine.begin());
  }

  private renderPreparation(): void {
    const { engine, i18n } = this.deps;
    this.heading("ui.assembly.prep.title");

    this.checkboxGroup(
      i18n.t("ui.assembly.prep.stories"),
      engine.availableStories("story").map((story) => ({
        id: story.id,
        label: i18n.t(`content.assembly.stories.${story.id}.title`),
      })),
      engine.plan.stories,
      (ids) => engine.selectStories(ids),
    );
    this.checkboxGroup(
      i18n.t("ui.assembly.prep.data"),
      engine.availableStories("data").map((story) => ({
        id: story.id,
        label: i18n.t(`content.assembly.stories.${story.id}.title`),
      })),
      engine.plan.data,
      (ids) => engine.selectData(ids),
    );
    this.checkboxGroup(
      i18n.t("ui.assembly.prep.invites"),
      engine
        .invitable()
        .map((npcId) => ({ id: npcId, label: this.deps.npcName(npcId) })),
      engine.plan.invited,
      (ids) => engine.selectInvites(ids),
    );

    this.actionButton(i18n.t("ui.assembly.prep.enterRoom"), () =>
      engine.enterRoom(),
    );
  }

  private renderRoom(): void {
    const { engine, i18n } = this.deps;
    this.heading("ui.assembly.room.title");
    const { present, absent } = engine.attendance();

    this.list(
      i18n.t("ui.assembly.room.present"),
      present.map((npcId) => this.deps.npcName(npcId)),
    );
    this.list(
      i18n.t("ui.assembly.room.empty"),
      absent.map(
        (entry) =>
          `${this.deps.npcName(entry.npcId)} — ${i18n.t(`content.assembly.groups.${entry.group}`)}`,
      ),
    );
    // Ben's canon line (§7.2): the room answers the care you put in.
    this.paragraph(
      present.includes("ben")
        ? "content.assembly.room.ben_ramp"
        : "content.assembly.room.ben_stairs",
    );
    this.actionButton(i18n.t("ui.assembly.room.continue"), () =>
      engine.proceedToStories(),
    );
  }

  private renderStories(): void {
    const { engine, i18n } = this.deps;
    this.heading("ui.assembly.stories.title");
    const unplayed = engine.unplayed();

    for (const id of [...engine.plan.stories, ...engine.plan.data]) {
      const row = document.createElement("div");
      row.className = "assembly-row";
      const label = document.createElement("span");
      label.textContent = i18n.t(`content.assembly.stories.${id}.title`);
      row.appendChild(label);
      if (unplayed.includes(id)) {
        const read = document.createElement("button");
        read.type = "button";
        read.textContent = i18n.t("ui.assembly.stories.read");
        read.addEventListener("click", () => {
          engine.playStory(id);
          this.render();
        });
        row.appendChild(read);
      } else {
        const line = document.createElement("em");
        line.textContent = i18n.t(`content.assembly.stories.${id}.line`);
        row.appendChild(line);
      }
      this.body.appendChild(row);
    }

    const tone = document.createElement("p");
    tone.className = "assembly-tone";
    tone.textContent = `${i18n.t("ui.assembly.stories.toneLabel")}: ${i18n.t(`ui.assembly.stories.tone.${engine.tone()}`)}`;
    this.body.appendChild(tone);

    this.actionButton(
      i18n.t("ui.assembly.stories.continue"),
      () => engine.proceedToConflicts(),
      unplayed.length > 0,
    );
  }

  private renderConflicts(): void {
    const { engine, i18n } = this.deps;
    this.heading("ui.assembly.conflicts.title");

    for (const conflict of engine.activeConflicts()) {
      const box = document.createElement("div");
      box.className = "assembly-conflict";
      const title = document.createElement("h4");
      title.textContent = i18n.t(
        `content.assembly.conflicts.${conflict.id}.title`,
      );
      box.appendChild(title);

      const chosen = engine.plan.conflicts[conflict.id];
      if (chosen !== undefined) {
        const outcome = document.createElement("em");
        outcome.textContent = i18n.t(
          `content.assembly.conflicts.${conflict.id}.positions.${chosen}`,
        );
        box.appendChild(outcome);
      } else {
        for (const position of conflict.positions) {
          const button = document.createElement("button");
          button.type = "button";
          let label = i18n.t(
            `content.assembly.conflicts.${conflict.id}.positions.${position.id}`,
          );
          if (position.kind === "synthesis") {
            label += ` (${this.costText(position.cost ?? {})})`;
            button.disabled = !engine.canAfford(position.cost);
          }
          button.textContent = label;
          button.addEventListener("click", () => {
            engine.choosePosition(conflict.id, position.id);
            this.render();
          });
          box.appendChild(button);
        }
      }
      this.body.appendChild(box);
    }

    this.actionButton(
      i18n.t("ui.assembly.conflicts.continue"),
      () => engine.proceedToPlan(),
      engine
        .activeConflicts()
        .some((conflict) => engine.plan.conflicts[conflict.id] === undefined),
    );
  }

  private renderPlan(): void {
    const { engine, i18n } = this.deps;
    this.heading("ui.assembly.plan.title");

    for (const category of engine.categories()) {
      const box = document.createElement("div");
      box.className = "assembly-category";
      const title = document.createElement("h4");
      title.textContent = i18n.t(`content.assembly.categories.${category}`);
      box.appendChild(title);
      for (const measure of engine
        .measures()
        .filter((candidate) => candidate.category === category)) {
        const button = document.createElement("button");
        button.type = "button";
        const inPlan = engine.plan.measures[measure.id] !== undefined;
        button.textContent = `${inPlan ? "✓ " : ""}${i18n.t(`content.assembly.measures.${measure.id}`)} (${this.costText(engine.measureCost(measure.id))})`;
        button.setAttribute("aria-pressed", String(inPlan));
        button.addEventListener("click", () => {
          if (inPlan) engine.removeMeasure(measure.id);
          else engine.addMeasure(measure.id);
          this.render();
        });
        box.appendChild(button);
      }
      this.body.appendChild(box);
    }

    const coverage = document.createElement("p");
    coverage.className = "assembly-coverage";
    coverage.textContent = `${i18n.t("ui.assembly.plan.coverage")}: ${engine.coverage()}/${engine.categories().length}`;
    this.body.appendChild(coverage);

    this.actionButton(
      i18n.t("ui.assembly.plan.continue"),
      () => engine.proceedToCommitment(),
      Object.keys(engine.plan.measures).length === 0,
    );
  }

  private renderCommitment(): void {
    const { engine, i18n } = this.deps;
    this.heading("ui.assembly.commit.title");
    this.paragraph("content.assembly.commitment.alexandria");

    const rows: Array<{
      measureId: string;
      owner: HTMLSelectElement;
      deadline: HTMLSelectElement;
      verify: HTMLSelectElement;
    }> = [];
    for (const measureId of Object.keys(engine.plan.measures)) {
      const row = document.createElement("div");
      row.className = "assembly-commit-row";
      const label = document.createElement("strong");
      label.textContent = i18n.t(`content.assembly.measures.${measureId}`);

      const owner = this.select(
        engine
          .owners()
          .map((id) => ({ value: id, label: this.deps.npcName(id) })),
      );
      const deadline = this.select(
        engine
          .deadlineOptions()
          .map((days) => ({
            value: String(days),
            label: `${days} ${i18n.t("ui.assembly.commit.days")}`,
          })),
      );
      const verify = this.select(
        engine
          .verificationOptions()
          .map((id) => ({
            value: id,
            label: i18n.t(`content.assembly.verifications.${id}`),
          })),
      );
      const committed = engine.plan.measures[measureId];
      if (committed) {
        owner.value = committed.owner;
        verify.value = committed.verification;
        owner.disabled = deadline.disabled = verify.disabled = true;
      }
      row.append(label, owner, deadline, verify);
      this.body.appendChild(row);
      rows.push({ measureId, owner, deadline, verify });
    }

    this.actionButton(i18n.t("ui.assembly.commit.sign"), () => {
      for (const row of rows) {
        engine.commit(row.measureId, {
          owner: row.owner.value,
          deadlineDays: Number(row.deadline.value),
          verification: row.verify.value,
        });
      }
      const done = engine.finalize();
      if (done) this.deps.saveNow();
      return done;
    });
  }

  private renderDone(): void {
    const { engine, i18n } = this.deps;
    this.heading("ui.assembly.done.title");
    this.paragraph("content.assembly.closing");
    const plan = engine.plan;
    this.list(i18n.t("ui.assembly.done.summary"), [
      `${i18n.t("ui.assembly.plan.coverage")}: ${engine.coverage()}/${engine.categories().length}`,
      `${i18n.t("ui.assembly.stories.toneLabel")}: ${i18n.t(`ui.assembly.stories.tone.${engine.tone()}`)}`,
      i18n.t(
        plan.overpromise
          ? "ui.assembly.done.overpromise"
          : "ui.assembly.done.withinMeans",
      ),
    ]);
  }

  // ---------- helpers ----------

  private costText(cost: Record<string, number>): string {
    const parts = Object.entries(cost)
      .filter(([, value]) => value > 0)
      .map(
        ([key, value]) => `${this.deps.i18n.t(`ui.resources.${key}`)} ${value}`,
      );
    return parts.length
      ? parts.join(" · ")
      : this.deps.i18n.t("ui.assembly.free");
  }

  private heading(key: string): void {
    const heading = document.createElement("h4");
    heading.className = "assembly-phase-title";
    heading.textContent = this.deps.i18n.t(key);
    this.body.appendChild(heading);
  }

  private paragraph(key: string): void {
    const paragraph = document.createElement("p");
    paragraph.textContent = this.deps.i18n.t(key);
    this.body.appendChild(paragraph);
  }

  private list(title: string, items: string[]): void {
    const heading = document.createElement("h4");
    heading.textContent = title;
    const list = document.createElement("ul");
    for (const item of items.length ? items : ["—"]) {
      const entry = document.createElement("li");
      entry.textContent = item;
      list.appendChild(entry);
    }
    this.body.append(heading, list);
  }

  private checkboxGroup(
    title: string,
    options: Array<{ id: string; label: string }>,
    selected: string[],
    apply: (ids: string[]) => boolean,
  ): void {
    const box = document.createElement("fieldset");
    box.className = "assembly-group";
    const legend = document.createElement("legend");
    legend.textContent = title;
    box.appendChild(legend);
    const inputs: HTMLInputElement[] = [];
    for (const option of options) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = option.id;
      input.checked = selected.includes(option.id);
      input.addEventListener("change", () => {
        const ids = inputs
          .filter((candidate) => candidate.checked)
          .map((candidate) => candidate.value);
        // The engine enforces slot counts; an over-pick simply bounces back.
        if (!apply(ids)) input.checked = !input.checked;
      });
      inputs.push(input);
      label.append(input, document.createTextNode(` ${option.label}`));
      box.appendChild(label);
    }
    if (options.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = this.deps.i18n.t("ui.assembly.prep.nothing");
      box.appendChild(empty);
    }
    this.body.appendChild(box);
  }

  private select(
    options: Array<{ value: string; label: string }>,
  ): HTMLSelectElement {
    const select = document.createElement("select");
    for (const option of options) {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      select.appendChild(element);
    }
    return select;
  }

  private actionButton(
    label: string,
    action: () => boolean,
    disabled = false,
  ): void {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "assembly-action";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", () => {
      if (action()) this.render();
    });
    this.body.appendChild(button);
  }
}
