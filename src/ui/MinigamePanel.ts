import { AllocationMinigame, type MinigameDefinition } from "../game/minigame/AllocationMinigame";
import type { Effect } from "../types/Dialogue";
import type { I18n } from "../i18n/I18n";

type MinigamePanelDeps = {
  root: HTMLElement;
  i18n: I18n;
  applyEffects: (effects: Effect[]) => void;
  logProgress: (eventType: string, payload: Record<string, unknown>) => void;
  onFinished: (minigameId: string, score: number) => void;
};

const STATUS_ICON = { empty: "·", partial: "…", valid: "✓", invalid: "✗" } as const;

/**
 * Task 9.1 — the allocation mini-game UI (pilot: Modular Repair). Click a
 * material, click a need: the piece moves. Checking is continuous (the
 * status icon updates on every move) and failing costs nothing — pieces
 * come back to the pile with a click. "Finish the Saturday" applies the
 * per-need reward for every valid combination.
 */
export class MinigamePanel {
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private game: AllocationMinigame | null = null;
  private selectedMaterial: string | null = null;

  constructor(private readonly deps: MinigamePanelDeps) {
    this.panel = document.createElement("aside");
    this.panel.className = "minigame-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Minigame");
    this.body = document.createElement("div");
    this.body.className = "minigame-body";
    this.panel.appendChild(this.body);
    deps.root.appendChild(this.panel);
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  open(definition: MinigameDefinition): void {
    this.game = new AllocationMinigame(definition);
    this.selectedMaterial = null;
    this.panel.hidden = false;
    this.render();
  }

  private render(): void {
    const { i18n } = this.deps;
    const game = this.game;
    if (!game) return;
    this.body.replaceChildren();

    const title = document.createElement("h3");
    title.textContent = i18n.t(`content.minigames.${game.id}.title`);
    const brief = document.createElement("p");
    brief.textContent = i18n.t(`content.minigames.${game.id}.brief`);
    this.body.append(title, brief);

    // The pile: unplaced materials (click to pick up).
    const pile = document.createElement("div");
    pile.className = "minigame-pile";
    for (const material of game.materials()) {
      if (game.placementOf(material.id) !== undefined) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = i18n.t(`content.minigames.${game.id}.materials.${material.id}`);
      button.setAttribute("aria-pressed", String(this.selectedMaterial === material.id));
      button.addEventListener("click", () => {
        this.selectedMaterial = this.selectedMaterial === material.id ? null : material.id;
        this.render();
      });
      pile.appendChild(button);
    }
    if (!pile.childElementCount) {
      const empty = document.createElement("em");
      empty.textContent = i18n.t("ui.minigame.pileEmpty");
      pile.appendChild(empty);
    }
    this.body.appendChild(pile);

    // The needs: click to place the selected piece / click a piece to
    // send it back — trying again is free.
    for (const need of game.needs()) {
      const box = document.createElement("div");
      box.className = "minigame-need";
      box.dataset.status = game.needStatus(need.id);

      const label = document.createElement("button");
      label.type = "button";
      label.className = "minigame-need-label";
      label.textContent = `${STATUS_ICON[game.needStatus(need.id)]} ${i18n.t(
        `content.minigames.${game.id}.needs.${need.id}`
      )} (${game.assigned(need.id).length}/${need.required})`;
      label.addEventListener("click", () => {
        if (this.selectedMaterial && game.assign(this.selectedMaterial, need.id)) {
          this.selectedMaterial = null;
        }
        this.render();
      });
      box.appendChild(label);

      for (const material of game.assigned(need.id)) {
        const piece = document.createElement("button");
        piece.type = "button";
        piece.className = "minigame-piece";
        piece.textContent = i18n.t(`content.minigames.${game.id}.materials.${material.id}`);
        piece.addEventListener("click", () => {
          game.unassign(material.id);
          this.render();
        });
        box.appendChild(piece);
      }
      if (game.needStatus(need.id) === "invalid") {
        const hint = document.createElement("em");
        hint.className = "minigame-hint";
        hint.textContent = i18n.t(`content.minigames.${game.id}.retry`);
        box.appendChild(hint);
      }
      this.body.appendChild(box);
    }

    const score = document.createElement("p");
    score.className = "minigame-score";
    score.textContent = `${i18n.t("ui.minigame.score")}: ${game.score()}/${game.needs().length}`;
    this.body.appendChild(score);

    const finish = document.createElement("button");
    finish.type = "button";
    finish.className = "minigame-finish";
    finish.textContent = i18n.t("ui.minigame.finish");
    finish.addEventListener("click", () => this.finish());
    this.body.appendChild(finish);
  }

  private finish(): void {
    const game = this.game;
    if (!game) return;
    const score = game.finish(this.deps.applyEffects);
    this.deps.logProgress("minigame_completed", {
      minigameId: game.id,
      score,
      total: game.needs().length
    });
    this.panel.hidden = true;
    this.game = null;
    this.deps.onFinished(game.id, score);
  }
}
