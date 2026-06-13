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
};

const PRONOUN_LABEL: Record<Pronoun, string> = {
  she: "she / her",
  he: "he / him",
  they: "they / them"
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

  constructor(private readonly deps: OpeningDeps) {
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
    subtitle.textContent = "Eurbanities and Fragmentation";

    const actions = document.createElement("div");
    actions.className = "opening-actions";

    const newGame = button("New game", "opening-primary", () => this.showPrologue(0));
    actions.appendChild(newGame);

    if (this.deps.canContinue) {
      actions.appendChild(button("Continue", "opening-secondary", () => this.finish({ mode: "continue" })));
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
      heading.textContent = panel.title;
      card.appendChild(heading);
    }

    const text = document.createElement("p");
    text.className = "opening-panel-text";
    text.textContent = panel.text;
    card.appendChild(text);

    const steps = document.createElement("p");
    steps.className = "opening-steps";
    steps.textContent = `${index + 1} / ${this.deps.prologue.length}`;

    const actions = document.createElement("div");
    actions.className = "opening-actions";
    actions.appendChild(button("Skip intro", "opening-secondary", () => this.showSelect()));
    const next = button(isLast ? "Choose your character" : "Continue", "opening-primary", () =>
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
    heading.textContent = "Same city, different routes";

    const hint = document.createElement("p");
    hint.className = "opening-subtitle";
    hint.textContent = "Who walks into the assembly tonight?";

    const grid = document.createElement("div");
    grid.className = "opening-grid";

    for (const character of this.deps.playable) {
      grid.appendChild(this.characterCard(character));
    }

    card.append(heading, hint, grid);
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
    img.src = `${this.deps.baseUrl}${character.portrait}`;
    img.addEventListener("error", () => {
      img.hidden = true;
    });

    const name = document.createElement("span");
    name.className = "opening-character-name";
    name.textContent = character.displayName;

    const tagline = document.createElement("span");
    tagline.className = "opening-character-tagline";
    tagline.textContent = character.tagline;

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

  private showCustomize(character: PlayableCharacter): void {
    const card = this.card();

    const heading = document.createElement("h2");
    heading.className = "opening-panel-title";
    heading.textContent = "Create your citizen";

    const form = document.createElement("form");
    form.className = "opening-form";

    const nameLabel = document.createElement("label");
    nameLabel.className = "opening-field";
    nameLabel.textContent = "Name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 24;
    nameInput.autocomplete = "off";
    nameInput.placeholder = "e.g. Alex";
    nameLabel.appendChild(nameInput);

    const pronounFieldset = document.createElement("fieldset");
    pronounFieldset.className = "opening-field";
    const legend = document.createElement("legend");
    legend.textContent = "Pronoun";
    pronounFieldset.appendChild(legend);

    let pronoun: Pronoun = character.pronoun;
    (Object.keys(PRONOUN_LABEL) as Pronoun[]).forEach((value) => {
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
      span.textContent = PRONOUN_LABEL[value];
      option.append(radio, span);
      pronounFieldset.appendChild(option);
    });

    const actions = document.createElement("div");
    actions.className = "opening-actions";
    actions.appendChild(button("Back", "opening-secondary", () => this.showSelect()));
    const confirm = button("Enter Eurbania", "opening-primary", () => {
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
