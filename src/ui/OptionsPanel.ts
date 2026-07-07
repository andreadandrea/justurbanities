import { LOCALES, LOCALE_NAMES, type I18n, type LocaleCode } from "../i18n/I18n";
import { ART_VARIANTS, type ArtVariant } from "../assets/ArtStyle";

/**
 * Options overlay (⚙): runtime language switch and the dual-art-style
 * toggle. Same toggle-panel pattern as the offline controls.
 */
/** Font sizes offered to the player (task 9.2) — multipliers of the base. */
export const FONT_SCALES = [1, 1.25, 1.5] as const;

export class OptionsPanel {
  private readonly panel: HTMLElement;
  private readonly label: HTMLElement;
  private readonly artLabel: HTMLElement;
  private readonly artOptions = new Map<ArtVariant, HTMLOptionElement>();
  private readonly scaleLabel: HTMLElement | null = null;
  private readonly contrastLabel: HTMLElement | null = null;

  constructor(
    root: HTMLElement,
    private readonly i18n: I18n,
    onLocaleChange: (locale: LocaleCode) => void,
    artStyle?: {
      current: ArtVariant;
      onChange: (variant: ArtVariant) => void;
    },
    accessibility?: {
      fontScale: number;
      onFontScale: (scale: number) => void;
      highContrast: boolean;
      onHighContrast: (enabled: boolean) => void;
    }
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

    // Dual art style (realistic / animal) — same identity, two skins.
    const artRow = document.createElement("label");
    artRow.className = "options-row";
    this.artLabel = document.createElement("span");
    artRow.appendChild(this.artLabel);
    const artSelect = document.createElement("select");
    for (const variant of ART_VARIANTS) {
      const option = document.createElement("option");
      option.value = variant;
      this.artOptions.set(variant, option);
      artSelect.appendChild(option);
    }
    artSelect.value = artStyle?.current ?? "realistic";
    artSelect.disabled = !artStyle;
    artSelect.addEventListener("change", () => {
      artStyle?.onChange(artSelect.value as ArtVariant);
    });
    artRow.appendChild(artSelect);
    this.panel.appendChild(artRow);

    // Accessibility (task 9.2): font scale and high-contrast mode.
    if (accessibility) {
      const scaleRow = document.createElement("label");
      scaleRow.className = "options-row";
      this.scaleLabel = document.createElement("span");
      scaleRow.appendChild(this.scaleLabel);
      const scaleSelect = document.createElement("select");
      for (const scale of FONT_SCALES) {
        const option = document.createElement("option");
        option.value = String(scale);
        option.textContent = `${Math.round(scale * 100)}%`;
        scaleSelect.appendChild(option);
      }
      scaleSelect.value = String(accessibility.fontScale);
      scaleSelect.addEventListener("change", () => {
        accessibility.onFontScale(Number(scaleSelect.value));
      });
      scaleRow.appendChild(scaleSelect);
      this.panel.appendChild(scaleRow);

      const contrastRow = document.createElement("label");
      contrastRow.className = "options-row";
      this.contrastLabel = document.createElement("span");
      contrastRow.appendChild(this.contrastLabel);
      const contrastInput = document.createElement("input");
      contrastInput.type = "checkbox";
      contrastInput.checked = accessibility.highContrast;
      contrastInput.addEventListener("change", () => {
        accessibility.onHighContrast(contrastInput.checked);
      });
      contrastRow.appendChild(contrastInput);
      this.panel.appendChild(contrastRow);
    }

    root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "options-toggle";
    toggle.textContent = "⚙";
    toggle.title = i18n.t("ui.options.hint");
    toggle.addEventListener("click", () => {
      this.panel.hidden = !this.panel.hidden;
    });
    root.appendChild(toggle);

    i18n.onChange(() => this.render());
    this.render();
  }

  private render(): void {
    this.label.textContent = this.i18n.t("ui.language.label");
    this.artLabel.textContent = this.i18n.t("ui.options.artStyle");
    for (const [variant, option] of this.artOptions) {
      option.textContent = this.i18n.t(`ui.options.art.${variant}`);
    }
    if (this.scaleLabel) this.scaleLabel.textContent = this.i18n.t("ui.options.fontScale");
    if (this.contrastLabel) this.contrastLabel.textContent = this.i18n.t("ui.options.highContrast");
  }
}
