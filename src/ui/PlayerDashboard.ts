import { buildMyGame, buildMyContribution } from "../game/report/PlayerSummary";
import type { GameState } from "../game/GameState";
import type { QuestManager } from "../game/quest/QuestManager";
import type { PromiseManager } from "../game/promise/PromiseManager";
import type { CityEvent } from "../game/mp/CityReducer";
import type { I18n } from "../i18n/I18n";

type PlayerDashboardDeps = {
  root: HTMLElement;
  i18n: I18n;
  gameState: GameState;
  questManager: QuestManager;
  promiseManager: PromiseManager;
  /** The player id used in the shared-city log (account id when signed in). */
  playerId: () => string;
  /** Session events — remote when joined, local log otherwise. */
  loadEvents: () => Promise<CityEvent[]>;
};

const PART_KEYS = ["ui.time.morning", "ui.time.afternoon", "ui.time.evening"];

/**
 * Player dashboard (📊, ratified 2026-07-07): two tabs — "my game" (live
 * personal state) and "my contribution" (my slice of the shared city).
 * All numbers come from the pure PlayerSummary builders.
 */
export class PlayerDashboard {
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private tab: "game" | "contribution" = "game";

  constructor(private readonly deps: PlayerDashboardDeps) {
    this.panel = document.createElement("aside");
    this.panel.className = "dashboard-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Player dashboard");
    this.body = document.createElement("div");
    this.panel.appendChild(this.body);
    deps.root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "dashboard-toggle";
    const renderToggle = () => {
      toggle.textContent = deps.i18n.t("ui.dashboard.toggle");
      toggle.title = deps.i18n.t("ui.dashboard.hint");
    };
    renderToggle();
    toggle.addEventListener("click", () => {
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden) void this.render();
    });
    deps.root.appendChild(toggle);
    deps.i18n.onChange(() => {
      renderToggle();
      if (!this.panel.hidden) void this.render();
    });
  }

  async render(): Promise<void> {
    const { i18n } = this.deps;
    this.body.replaceChildren();

    const title = document.createElement("h3");
    title.textContent = i18n.t("ui.dashboard.title");

    const tabs = document.createElement("div");
    tabs.className = "dashboard-tabs";
    for (const tab of ["game", "contribution"] as const) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = i18n.t(`ui.dashboard.tab.${tab}`);
      btn.setAttribute("aria-pressed", String(this.tab === tab));
      btn.addEventListener("click", () => {
        this.tab = tab;
        void this.render();
      });
      tabs.appendChild(btn);
    }
    this.body.append(title, tabs);

    if (this.tab === "game") {
      this.renderMyGame();
    } else {
      await this.renderContribution();
    }
  }

  private line(label: string, value: string): HTMLElement {
    const row = document.createElement("p");
    row.className = "dashboard-line";
    const name = document.createElement("span");
    name.textContent = label;
    const val = document.createElement("strong");
    val.textContent = value;
    row.append(name, val);
    return row;
  }

  private renderMyGame(): void {
    const { i18n, gameState, questManager, promiseManager } = this.deps;
    const summary = buildMyGame(gameState, questManager.getActiveQuests(), promiseManager.list());

    this.body.append(
      this.line(i18n.t("ui.dashboard.chapter"), String(summary.chapter)),
      this.line(
        i18n.t("ui.dashboard.day"),
        `${summary.day} · ${i18n.t(PART_KEYS[summary.timePart] ?? PART_KEYS[0])}`
      )
    );

    const quests = document.createElement("div");
    const questsTitle = document.createElement("h4");
    questsTitle.textContent = i18n.t("ui.dashboard.activeQuests");
    quests.appendChild(questsTitle);
    const list = document.createElement("ul");
    if (summary.activeQuests.length === 0) {
      const li = document.createElement("li");
      li.textContent = i18n.t("ui.dashboard.none");
      list.appendChild(li);
    }
    for (const quest of summary.activeQuests) {
      const li = document.createElement("li");
      li.textContent = i18n.t(quest.title);
      list.appendChild(li);
    }
    quests.appendChild(list);
    this.body.appendChild(quests);

    const promises = document.createElement("div");
    const promisesTitle = document.createElement("h4");
    promisesTitle.textContent = i18n.t("ui.dashboard.promises");
    promises.appendChild(promisesTitle);
    const plist = document.createElement("ul");
    if (summary.promises.length === 0) {
      const li = document.createElement("li");
      li.textContent = i18n.t("ui.dashboard.none");
      plist.appendChild(li);
    }
    for (const promise of summary.promises) {
      const li = document.createElement("li");
      const icon = promise.status === "kept" ? "✓" : promise.status === "broken" ? "✗" : "…";
      li.textContent = `${icon} ${i18n.t(`content.promises.${promise.id}`)} (${i18n.t("ui.dashboard.deadline")}: ${promise.deadlineDay})`;
      if (promise.status === "broken") li.className = "dashboard-broken";
      plist.appendChild(li);
    }
    promises.appendChild(plist);
    this.body.appendChild(promises);
  }

  private async renderContribution(): Promise<void> {
    const { i18n } = this.deps;
    const loading = document.createElement("p");
    loading.textContent = i18n.t("ui.dashboard.loading");
    this.body.appendChild(loading);

    const events = await this.deps.loadEvents();
    loading.remove();
    const mine = buildMyContribution(this.deps.playerId(), events);

    this.body.append(
      this.line(i18n.t("ui.dashboard.myEvents"), String(mine.events)),
      this.line(i18n.t("ui.dashboard.myQuests"), mine.questsCompleted.length ? mine.questsCompleted.join(", ") : "—"),
      this.line(i18n.t("ui.dashboard.myMaps"), mine.empathyMaps.length ? mine.empathyMaps.join(", ") : "—"),
      this.line(i18n.t("ui.dashboard.promisesKept"), `${mine.promisesKept} ✓ / ${mine.promisesBroken} ✗`)
    );

    const contributed = document.createElement("div");
    const heading = document.createElement("h4");
    heading.textContent = i18n.t("ui.dashboard.resourcesContributed");
    contributed.appendChild(heading);
    const list = document.createElement("ul");
    const entries = Object.entries(mine.resourcesContributed);
    if (entries.length === 0) {
      const li = document.createElement("li");
      li.textContent = i18n.t("ui.dashboard.none");
      list.appendChild(li);
    }
    for (const [key, value] of entries) {
      const li = document.createElement("li");
      li.textContent = `${i18n.t(`ui.resources.${key}`)}: ${value > 0 ? "+" : ""}${value}`;
      list.appendChild(li);
    }
    contributed.appendChild(list);
    this.body.appendChild(contributed);

    this.body.appendChild(
      this.line(
        i18n.t("ui.dashboard.classTotals"),
        `${mine.classTotals.players} 👥 · ${mine.classTotals.events} ⚡ · ${mine.classTotals.questsCompleted} ✓`
      )
    );
  }
}
