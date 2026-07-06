import { buildReport } from "../game/report/ReportGenerator";
import { GameState } from "../game/GameState";
import type { QuestManager } from "../game/quest/QuestManager";
import type { ProgressRepository } from "../storage/ProgressRepository";
import type { SyncQueue } from "../sync/SyncQueue";
import type { LocalSession } from "../storage/LocalDatabase";
import type { I18n } from "../i18n/I18n";

type ReportButtonDeps = {
  root: HTMLElement;
  gameState: GameState;
  questManager: QuestManager;
  progressRepository: ProgressRepository;
  syncQueue: SyncQueue;
  session: LocalSession;
  saveStatus: HTMLElement;
  i18n: I18n;
};

/**
 * Task 7 — generates the local educational report (JSON) from session,
 * savegame state, progress events, resource changes and quest completion,
 * and downloads it as a file. Everything stays on the device.
 */
export class ReportButton {
  constructor(private readonly deps: ReportButtonDeps) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "report-toggle";
    button.textContent = deps.i18n.t("ui.report.button");
    button.title = deps.i18n.t("ui.report.hint");
    button.addEventListener("click", () => void this.generate());
    deps.root.appendChild(button);
  }

  private async generate(): Promise<void> {
    const { gameState, questManager, progressRepository, syncQueue, session, saveStatus } = this.deps;

    const events = await progressRepository.listBySession(session.id);
    const report = buildReport({
      session,
      state: gameState.snapshot(),
      quests: questManager.snapshot(),
      events,
      initialResources: { ...new GameState().resources }
    });

    const fileName = `justurbanities-report-${report.generatedAt.slice(0, 19).replace(/[:T]/g, "-")}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    const event = await progressRepository.append(session.id, "local-user", "report_generated", {
      fileName,
      totalEvents: report.participation.totalEvents
    });
    await syncQueue.enqueue("progress_event", event.id, "create", event);

    saveStatus.textContent = `${this.deps.i18n.t("ui.report.downloaded")} ${fileName}`;
  }
}
