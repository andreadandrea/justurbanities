import type { CityEvent } from "../game/mp/CityReducer";
import { buildClassReport } from "../game/mp/ClassReport";
import type { I18n } from "../i18n/I18n";

type FacilitatorPanelDeps = {
  root: HTMLElement;
  i18n: I18n;
  sessionCode: () => string;
  /** The ordered session log — local events, or the remote fetch under MP-2. */
  loadEvents: () => Promise<CityEvent[]>;
  /** Pseudonym for a device key, when known (SessionModel players). */
  playerName: (playerId: string) => string;
};

/**
 * MP-4 facilitator dashboard (🧑‍🏫, mounted under ?facilitator=1): a
 * read-only fold of the session log — who arrived, resources, promises,
 * crisis tiers, the plan — plus the class report export (JSON download).
 * The teacher follows the session without playing; nothing here writes
 * game state.
 */
export class FacilitatorPanel {
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;

  constructor(private readonly deps: FacilitatorPanelDeps) {
    const { root, i18n } = deps;

    this.panel = document.createElement("aside");
    this.panel.className = "facilitator-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Facilitator");

    const title = document.createElement("h3");
    title.textContent = i18n.t("ui.facilitator.title");
    this.body = document.createElement("div");
    this.body.className = "facilitator-body";
    this.panel.append(title, this.body);
    root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "facilitator-toggle";
    toggle.textContent = i18n.t("ui.facilitator.toggle");
    toggle.title = i18n.t("ui.facilitator.hint");
    toggle.addEventListener("click", () => {
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden) void this.refresh();
    });
    root.appendChild(toggle);
  }

  async refresh(): Promise<void> {
    const { i18n } = this.deps;
    this.body.replaceChildren();
    let events: CityEvent[];
    try {
      events = await this.deps.loadEvents();
    } catch {
      const error = document.createElement("p");
      error.textContent = i18n.t("ui.facilitator.loadFailed");
      this.body.appendChild(error);
      return;
    }
    const report = buildClassReport(this.deps.sessionCode(), events);

    this.section(
      i18n.t("ui.facilitator.players"),
      report.players.map(
        (player) =>
          `${this.deps.playerName(player.playerId)} — ${player.events} · ${player.questsCompleted.join(" ") || "—"}`
      )
    );
    this.section(
      i18n.t("ui.facilitator.resources"),
      Object.entries(report.city.resources).map(([key, value]) => `${i18n.t(`ui.resources.${key}`)}: ${value}`)
    );
    this.section(
      i18n.t("ui.facilitator.promises"),
      Object.entries(report.city.promises).map(
        ([promiseId, promise]) =>
          `${i18n.t(`content.promises.${promiseId}`)} — ${promise.owner} (${i18n.t(`ui.logbook.status.${promise.status}`)})`
      )
    );
    this.section(
      i18n.t("ui.facilitator.crises"),
      Object.entries(report.city.crises).map(
        ([crisisId, crisis]) => `${i18n.t(`content.crises.${crisisId}.title`)} — ${i18n.t(`ui.report.tier.${crisis.tier}`)}`
      )
    );
    this.section(
      i18n.t("ui.facilitator.plan"),
      report.city.planMeasures.map(
        (measure) => `${i18n.t(`content.assembly.measures.${measure.measureId}`)} — ${this.deps.playerName(measure.owner)}`
      )
    );

    const download = document.createElement("button");
    download.type = "button";
    download.className = "facilitator-export";
    download.textContent = i18n.t("ui.facilitator.export");
    download.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `justurbanities-class-${report.sessionCode}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
    this.body.appendChild(download);
  }

  private section(title: string, lines: string[]): void {
    const heading = document.createElement("h4");
    heading.textContent = title;
    const list = document.createElement("ul");
    for (const line of lines.length ? lines : ["—"]) {
      const item = document.createElement("li");
      item.textContent = line;
      list.appendChild(item);
    }
    this.body.append(heading, list);
  }
}
