import type { I18n } from "../i18n/I18n";
import { variantPath, type ArtVariant } from "../assets/ArtStyle";

export type Pronoun = "she" | "he" | "they";

export type PlayableCharacter = {
  id: string;
  displayName: string;
  pronoun: Pronoun;
  customizable: boolean;
  tagline: string;
  portrait: string;
};

export type ProloguePanel = { title?: string; text: string };

export type OpeningResult =
  | { mode: "continue" }
  | { mode: "new"; character: string; name: string; pronoun: Pronoun };

type OpeningDeps = {
  root: HTMLElement;
  playable: PlayableCharacter[];
  prologue: ProloguePanel[];
  canContinue: boolean;
  baseUrl: string;
  i18n: I18n;
  /** Dual art style preview on the select screen; persists the preference. */
  artStyle?: { initial: ArtVariant; onChange: (variant: ArtVariant) => void };
};

const PRONOUN_KEY: Record<Pronoun, string> = {
  she: "ui.opening.pronounShe",
  he: "ui.opening.pronounHe",
  they: "ui.opening.pronounThey"
};

/**
 * Opening flow (title → narrative prologue → character selection →
 * customization), rendered as an accessible HTML overlay above the canvas
 * per the project's UI rules. Resolves with the player's choice; the app
 * then applies it to GameState and enters the world.
 */
export class OpeningScreens {
  private readonly overlay: HTMLElement;
  private resolve!: (result: OpeningResult) => void;
  private previewVariant: ArtVariant = "realistic";

  constructor(private readonly deps: OpeningDeps) {
    this.previewVariant = deps.artStyle?.initial ?? "realistic";
    this.overlay = document.createElement("div");
    this.overlay.className = "opening";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.hidden = true;
    deps.root.appendChild(this.overlay);
  }

  run(): Promise<OpeningResult> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.overlay.hidden = false;
      this.showTitle();
    });
  }

  private finish(result: OpeningResult): void {
    this.overlay.hidden = true;
    this.overlay.replaceChildren();
    this.overlay.remove();
    this.resolve(result);
  }

  private t(key: string): string {
    return this.deps.i18n.t(key);
  }

  private card(): HTMLElement {
    const card = document.createElement("div");
    card.className = "opening-card";
    this.overlay.replaceChildren(card);
    return card;
  }

  private showTitle(): void {
    const card = this.card();

    const title = document.createElement("h1");
    title.className = "opening-title";
    title.textContent = "Justurbanities";

    const subtitle = document.createElement("p");
    subtitle.className = "opening-subtitle";
    subtitle.textContent = this.t("ui.opening.subtitle");

    const actions = document.createElement("div");
    actions.className = "opening-actions";

    const newGame = button(this.t("ui.opening.newGame"), "opening-primary", () => this.showPrologue(0));
    actions.appendChild(newGame);

    if (this.deps.canContinue) {
      actions.appendChild(button(this.t("ui.opening.continue"), "opening-secondary", () => this.finish({ mode: "continue" })));
    }

    card.append(title, subtitle, actions);
    newGame.focus();
  }

  private showPrologue(index: number): void {
    const panel = this.deps.prologue[index];
    if (!panel) {
      this.showSelect();
      return;
    }

    const card = this.card();
    const isLast = index === this.deps.prologue.length - 1;

    if (panel.title) {
      const heading = document.createElement("h2");
      heading.className = "opening-panel-title";
      heading.textContent = this.t(panel.title);
      card.appendChild(heading);
    }

    const text = document.createElement("p");
    text.className = "opening-panel-text";
    text.textContent = this.t(panel.text);
    card.appendChild(text);

    const steps = document.createElement("p");
    steps.className = "opening-steps";
    steps.textContent = `${index + 1} / ${this.deps.prologue.length}`;

    const actions = document.createElement("div");
    actions.className = "opening-actions";
    actions.appendChild(button(this.t("ui.opening.skipIntro"), "opening-secondary", () => this.showSelect()));
    const next = button(isLast ? this.t("ui.opening.chooseCharacter") : this.t("ui.opening.next"), "opening-primary", () =>
      this.showPrologue(index + 1)
    );
    actions.appendChild(next);

    card.append(steps, actions);
    next.focus();
  }

  private showSelect(): void {
    const card = this.card();

    const heading = document.createElement("h2");
    heading.className = "opening-panel-title";
    heading.textContent = this.t("ui.opening.selectTitle");

    const hint = document.createElement("p");
    hint.className = "opening-subtitle";
    hint.textContent = this.t("ui.opening.selectHint");

    const grid = document.createElement("div");
    grid.className = "opening-grid";

    for (const character of this.deps.playable) {
      grid.appendChild(this.characterCard(character));
    }

    card.append(heading, hint, grid);
    if (this.deps.artStyle) card.appendChild(this.artToggle());
    const firstButton = grid.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();
  }

  private characterCard(character: PlayableCharacter): HTMLElement {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "opening-character";

    const img = document.createElement("img");
    img.className = "opening-portrait";
    img.alt = "";
    const realisticSrc = `${this.deps.baseUrl}${character.portrait}`;
    img.src = `${this.deps.baseUrl}${variantPath(character.portrait, this.previewVariant)}`;
    img.addEventListener("error", () => {
      // Fallback chain: missing variant art -> realistic -> hide.
      if (img.src !== realisticSrc && !img.src.endsWith(realisticSrc)) {
        img.src = realisticSrc;
      } else {
        img.hidden = true;
      }
    });

    const name = document.createElement("span");
    name.className = "opening-character-name";
    name.textContent = character.displayName;

    const tagline = document.createElement("span");
    tagline.className = "opening-character-tagline";
    tagline.textContent = this.t(character.tagline);

    cell.append(img, name, tagline);
    cell.addEventListener("click", () => {
      if (character.customizable) {
        this.showCustomize(character);
      } else {
        this.finish({
          mode: "new",
          character: character.id,
          name: character.displayName,
          pronoun: character.pronoun
        });
      }
    });

    return cell;
  }

  /** Realistic/animal preview toggle on the select screen (spec §3). */
  private artToggle(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "opening-art-toggle";
    const other: ArtVariant = this.previewVariant === "realistic" ? "animal" : "realistic";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "opening-secondary";
    toggle.textContent = `${this.t("ui.options.artStyle")}: ${this.t(`ui.options.art.${other}`)}`;
    toggle.addEventListener("click", () => {
      this.previewVariant = other;
      this.deps.artStyle?.onChange(other);
      this.showSelect();
    });
    wrap.appendChild(toggle);
    return wrap;
  }

  private showCustomize(character: PlayableCharacter): void {
    const card = this.card();

    const heading = document.createElement("h2");
    heading.className = "opening-panel-title";
    heading.textContent = this.t("ui.opening.createTitle");

    const form = document.createElement("form");
    form.className = "opening-form";

    const nameLabel = document.createElement("label");
    nameLabel.className = "opening-field";
    nameLabel.textContent = this.t("ui.opening.name");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 24;
    nameInput.autocomplete = "off";
    nameInput.placeholder = this.t("ui.opening.namePlaceholder");
    nameLabel.appendChild(nameInput);

    const pronounFieldset = document.createElement("fieldset");
    pronounFieldset.className = "opening-field";
    const legend = document.createElement("legend");
    legend.textContent = this.t("ui.opening.pronoun");
    pronounFieldset.appendChild(legend);

    let pronoun: Pronoun = character.pronoun;
    (Object.keys(PRONOUN_KEY) as Pronoun[]).forEach((value) => {
      const option = document.createElement("label");
      option.className = "opening-radio";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "pronoun";
      radio.value = value;
      radio.checked = value === pronoun;
      radio.addEventListener("change", () => {
        pronoun = value;
      });
      const span = document.createElement("span");
      span.textContent = this.t(PRONOUN_KEY[value]);
      option.append(radio, span);
      pronounFieldset.appendChild(option);
    });

    const actions = document.createElement("div");
    actions.className = "opening-actions";
    actions.appendChild(button(this.t("ui.opening.back"), "opening-secondary", () => this.showSelect()));
    const confirm = button(this.t("ui.opening.enter"), "opening-primary", () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      this.finish({ mode: "new", character: character.id, name, pronoun });
    });
    confirm.type = "submit";
    actions.appendChild(confirm);

    form.addEventListener("submit", (event) => event.preventDefault());
    form.append(nameLabel, pronounFieldset, actions);
    card.append(heading, form);
    nameInput.focus();
  }
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}
