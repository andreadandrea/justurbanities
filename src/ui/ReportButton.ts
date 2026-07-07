import { buildReport, type EducationalReport } from "../game/report/ReportGenerator";
import { printableReportHtml } from "../game/report/PrintableReport";
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
  /** Display name for NPC/playable/district ids in the printable view. */
  displayName: (id: string) => string;
};

/**
 * Task 7 — generates the local educational report from session, savegame
 * state, progress events, resource changes and quest completion. Two
 * exports: JSON download (machine-readable) and a printable HTML view
 * (print → save as PDF, fully offline). Everything stays on the device.
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

    const printButton = document.createElement("button");
    printButton.type = "button";
    printButton.className = "report-print-toggle";
    printButton.textContent = deps.i18n.t("ui.report.printButton");
    printButton.title = deps.i18n.t("ui.report.printHint");
    printButton.addEventListener("click", () => void this.print());
    deps.root.appendChild(printButton);
  }

  private async buildCurrentReport(): Promise<EducationalReport> {
    const { gameState, questManager, progressRepository, session } = this.deps;
    const events = await progressRepository.listBySession(session.id);
    return buildReport({
      session,
      state: gameState.snapshot(),
      quests: questManager.snapshot(),
      events,
      initialResources: { ...new GameState().resources }
    });
  }

  /** Printable view (task 7.3): open, print, done — the browser makes the PDF. */
  private async print(): Promise<void> {
    const { i18n, displayName, saveStatus } = this.deps;
    const report = await this.buildCurrentReport();
    const html = printableReportHtml(report, (key) => i18n.t(key), displayName);
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const printWindow = window.open(url, "_blank");
    if (!printWindow) {
      URL.revokeObjectURL(url);
      saveStatus.textContent = i18n.t("ui.report.popupBlocked");
      return;
    }
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
      URL.revokeObjectURL(url);
    });
  }

  private async generate(): Promise<void> {
    const { progressRepository, syncQueue, session, saveStatus } = this.deps;

    const report = await this.buildCurrentReport();

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
