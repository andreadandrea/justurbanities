import type { OfflineAssetCache } from "../assets/OfflineAssetCache";
import type { I18n } from "../i18n/I18n";

/**
 * Offline play controls (Task 5): download all runtime assets into the
 * dedicated Cache API bucket, clear it, and show offline-ready status.
 */
export class OfflineControls {
  private readonly panel: HTMLElement;
  private readonly statusLine: HTMLElement;
  private readonly progress: HTMLProgressElement;
  private readonly downloadButton: HTMLButtonElement;
  private readonly clearButton: HTMLButtonElement;
  private busy = false;

  constructor(root: HTMLElement, private readonly cache: OfflineAssetCache, private readonly i18n: I18n) {
    this.panel = document.createElement("aside");
    this.panel.className = "offline-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Offline assets");

    const title = document.createElement("h3");
    title.textContent = i18n.t("ui.offline.title");

    this.statusLine = document.createElement("p");
    this.statusLine.className = "offline-status";
    this.statusLine.textContent = i18n.t("ui.offline.checking");

    this.progress = document.createElement("progress");
    this.progress.max = 100;
    this.progress.value = 0;
    this.progress.hidden = true;

    this.downloadButton = document.createElement("button");
    this.downloadButton.type = "button";
    this.downloadButton.textContent = i18n.t("ui.offline.download");
    this.downloadButton.addEventListener("click", () => void this.download());

    this.clearButton = document.createElement("button");
    this.clearButton.type = "button";
    this.clearButton.className = "offline-clear";
    this.clearButton.textContent = i18n.t("ui.offline.clear");
    this.clearButton.addEventListener("click", () => void this.clear());

    this.panel.append(title, this.statusLine, this.progress, this.downloadButton, this.clearButton);
    root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "offline-toggle";
    toggle.textContent = i18n.t("ui.offline.toggle");
    toggle.title = i18n.t("ui.offline.toggleHint");
    toggle.addEventListener("click", () => {
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden) void this.refreshStatus();
    });
    root.appendChild(toggle);
  }

  private async refreshStatus(): Promise<void> {
    if (!this.cache.supported) {
      this.statusLine.textContent = this.i18n.t("ui.offline.unsupported");
      this.downloadButton.disabled = true;
      this.clearButton.disabled = true;
      return;
    }
    const status = await this.cache.status();
    this.statusLine.textContent = status.ready
      ? `✅ ${this.i18n.t("ui.offline.ready")} (${status.cached}/${status.total})`
      : status.cached > 0
        ? `⚠️ ${this.i18n.t("ui.offline.partial")}: ${status.cached}/${status.total}`
        : `${this.i18n.t("ui.offline.notDownloaded")} (${status.total})`;
    this.downloadButton.disabled = this.busy || status.ready;
    this.clearButton.disabled = this.busy || status.cached === 0;
  }

  private async download(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.downloadButton.disabled = true;
    this.clearButton.disabled = true;
    this.progress.hidden = false;

    try {
      const status = await this.cache.download(({ done, total, failed }) => {
        this.progress.value = Math.round((done / total) * 100);
        this.statusLine.textContent = `${this.i18n.t("ui.offline.downloading")} ${done}/${total}${failed ? ` (${failed} ✗)` : ""}…`;
      });
      this.statusLine.textContent = status.ready
        ? `✅ ${this.i18n.t("ui.offline.ready")} (${status.cached}/${status.total})`
        : `⚠️ ${this.i18n.t("ui.offline.doneWithIssues")}: ${status.cached}/${status.total}`;
    } catch (error) {
      this.statusLine.textContent = error instanceof Error ? error.message : this.i18n.t("ui.offline.failed");
    } finally {
      this.progress.hidden = true;
      this.busy = false;
      await this.refreshStatus();
    }
  }

  private async clear(): Promise<void> {
    if (this.busy) return;
    await this.cache.clear();
    await this.refreshStatus();
  }
}
