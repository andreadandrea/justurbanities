import { LOCALES, LOCALE_NAMES, type I18n, type LocaleCode } from "../i18n/I18n";

/**
 * Options overlay (⚙). Hosts the runtime language switch now; the Phase 5
 * art-style toggle will live here too. Same toggle-panel pattern as the
 * offline controls.
 */
export class OptionsPanel {
  private readonly panel: HTMLElement;
  private readonly label: HTMLElement;

  constructor(
    root: HTMLElement,
    private readonly i18n: I18n,
    onLocaleChange: (locale: LocaleCode) => void
  ) {
    this.panel = document.createElement("aside");
    this.panel.className = "options-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Options");

    const row = document.createElement("label");
    row.className = "options-row";
    this.label = document.createElement("span");
    row.appendChild(this.label);

    const select = document.createElement("select");
    for (const locale of LOCALES) {
      const option = document.createElement("option");
      option.value = locale;
      option.textContent = LOCALE_NAMES[locale];
      select.appendChild(option);
    }
    select.value = i18n.locale;
    select.addEventListener("change", () => {
      const locale = select.value as LocaleCode;
      i18n.setLocale(locale);
      onLocaleChange(locale);
    });
    row.appendChild(select);
    this.panel.appendChild(row);
    root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "options-toggle";
    toggle.textContent = "⚙";
    toggle.title = "Options";
    toggle.addEventListener("click", () => {
      this.panel.hidden = !this.panel.hidden;
    });
    root.appendChild(toggle);

    i18n.onChange(() => this.render());
    this.render();
  }

  private render(): void {
    this.label.textContent = this.i18n.t("ui.language.label");
  }
}
