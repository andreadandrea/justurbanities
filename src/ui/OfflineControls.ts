import type { OfflineAssetCache } from "../assets/OfflineAssetCache";
import type { ArtVariant } from "../assets/ArtStyle";
import type { I18n } from "../i18n/I18n";

export type OfflinePack = {
  variant: ArtVariant;
  cache: OfflineAssetCache;
};

type PackRow = {
  pack: OfflinePack;
  statusLine: HTMLElement;
  progress: HTMLProgressElement;
  downloadButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Offline play controls: one downloadable cache pack per art variant
 * (SPEC_Dual_Art_Style §3) — a classroom can install the animal pack only
 * and play fully offline. Shows per-pack status and stored size.
 */
export class OfflineControls {
  private readonly panel: HTMLElement;
  private readonly rows: PackRow[] = [];
  private busy = false;

  constructor(root: HTMLElement, packs: OfflinePack[], private readonly i18n: I18n) {
    this.panel = document.createElement("aside");
    this.panel.className = "offline-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Offline assets");

    const title = document.createElement("h3");
    title.textContent = i18n.t("ui.offline.title");
    this.panel.appendChild(title);

    for (const pack of packs) {
      this.panel.appendChild(this.packSection(pack));
    }
    root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "offline-toggle";
    toggle.textContent = i18n.t("ui.offline.toggle");
    toggle.title = i18n.t("ui.offline.toggleHint");
    toggle.addEventListener("click", () => {
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden) void this.refreshAll();
    });
    root.appendChild(toggle);
  }

  private packSection(pack: OfflinePack): HTMLElement {
    const section = document.createElement("section");
    section.className = "offline-pack";

    const heading = document.createElement("h4");
    heading.textContent = this.i18n.t(`ui.options.art.${pack.variant}`);

    const statusLine = document.createElement("p");
    statusLine.className = "offline-status";
    statusLine.textContent = this.i18n.t("ui.offline.checking");

    const progress = document.createElement("progress");
    progress.max = 100;
    progress.value = 0;
    progress.hidden = true;

    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.textContent = this.i18n.t("ui.offline.download");

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "offline-clear";
    clearButton.textContent = this.i18n.t("ui.offline.clear");

    const row: PackRow = { pack, statusLine, progress, downloadButton, clearButton };
    downloadButton.addEventListener("click", () => void this.download(row));
    clearButton.addEventListener("click", () => void this.clear(row));
    this.rows.push(row);

    section.append(heading, statusLine, progress, downloadButton, clearButton);
    return section;
  }

  private async refreshAll(): Promise<void> {
    await Promise.all(this.rows.map((row) => this.refresh(row)));
  }

  private async refresh(row: PackRow): Promise<void> {
    if (!row.pack.cache.supported) {
      row.statusLine.textContent = this.i18n.t("ui.offline.unsupported");
      row.downloadButton.disabled = true;
      row.clearButton.disabled = true;
      return;
    }
    const status = await row.pack.cache.status();
    const size = formatSize(status.sizeBytes);
    row.statusLine.textContent = status.ready
      ? `✅ ${this.i18n.t("ui.offline.ready")} (${status.cached}/${status.total} · ${size})`
      : status.cached > 0
        ? `⚠️ ${this.i18n.t("ui.offline.partial")}: ${status.cached}/${status.total} · ${size}`
        : `${this.i18n.t("ui.offline.notDownloaded")} (${status.total})`;
    row.downloadButton.disabled = this.busy || status.ready;
    row.clearButton.disabled = this.busy || status.cached === 0;
  }

  private async download(row: PackRow): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    for (const other of this.rows) {
      other.downloadButton.disabled = true;
      other.clearButton.disabled = true;
    }
    row.progress.hidden = false;

    try {
      const status = await row.pack.cache.download(({ done, total, failed }) => {
        row.progress.value = Math.round((done / total) * 100);
        row.statusLine.textContent = `${this.i18n.t("ui.offline.downloading")} ${done}/${total}${failed ? ` (${failed} ✗)` : ""}…`;
      });
      const size = formatSize(status.sizeBytes);
      row.statusLine.textContent = status.ready
        ? `✅ ${this.i18n.t("ui.offline.ready")} (${status.cached}/${status.total} · ${size})`
        : `⚠️ ${this.i18n.t("ui.offline.doneWithIssues")}: ${status.cached}/${status.total} · ${size}`;
    } catch (error) {
      row.statusLine.textContent = error instanceof Error ? error.message : this.i18n.t("ui.offline.failed");
    } finally {
      row.progress.hidden = true;
      this.busy = false;
      await this.refreshAll();
    }
  }

  private async clear(row: PackRow): Promise<void> {
    if (this.busy) return;
    await row.pack.cache.clear();
    await this.refreshAll();
  }
}
