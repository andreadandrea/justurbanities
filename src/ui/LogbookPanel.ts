import type { PromiseManager } from "../game/promise/PromiseManager";
import type { I18n } from "../i18n/I18n";

const STATUS_ICON = { active: "…", kept: "✓", broken: "✗" } as const;

/**
 * Logbook (📖): the promises page — what was promised, by whom, the
 * deadline, and whether it was kept or broken. More pages (map notes,
 * empathy maps) arrive with later phases.
 */
export class LogbookPanel {
  private readonly panel: HTMLElement;
  private readonly list: HTMLElement;

  constructor(
    root: HTMLElement,
    private readonly promises: PromiseManager,
    private readonly i18n: I18n
  ) {
    this.panel = document.createElement("aside");
    this.panel.className = "logbook-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Logbook");

    const title = document.createElement("h3");
    title.textContent = i18n.t("ui.logbook.title");
    this.list = document.createElement("ul");
    this.list.className = "logbook-promises";
    this.panel.append(title, this.list);
    root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "logbook-toggle";
    toggle.textContent = i18n.t("ui.logbook.toggle");
    toggle.title = i18n.t("ui.logbook.hint");
    toggle.addEventListener("click", () => {
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden) this.render();
    });
    root.appendChild(toggle);

    i18n.onChange(() => {
      title.textContent = i18n.t("ui.logbook.title");
      toggle.textContent = i18n.t("ui.logbook.toggle");
      toggle.title = i18n.t("ui.logbook.hint");
      if (!this.panel.hidden) this.render();
    });
  }

  render(): void {
    this.list.replaceChildren();
    const entries = this.promises.list();
    if (entries.length === 0) {
      const empty = document.createElement("li");
      empty.className = "logbook-empty";
      empty.textContent = this.i18n.t("ui.logbook.empty");
      this.list.appendChild(empty);
      return;
    }
    for (const entry of entries) {
      const item = document.createElement("li");
      item.className = "logbook-promise";
      item.dataset.status = entry.status;

      const icon = document.createElement("span");
      icon.className = "logbook-status";
      icon.textContent = STATUS_ICON[entry.status];
      icon.setAttribute("aria-label", this.i18n.t(`ui.logbook.status.${entry.status}`));

      const text = document.createElement("span");
      text.className = "logbook-text";
      text.textContent = this.i18n.t(`content.promises.${entry.id}`);

      const meta = document.createElement("span");
      meta.className = "logbook-meta";
      meta.textContent = `${this.i18n.t("ui.logbook.by")} ${entry.owner} · ${this.i18n.t("ui.time.day")} ${entry.deadlineDay}`;

      item.append(icon, text, meta);
      this.list.appendChild(item);
    }
  }
}
