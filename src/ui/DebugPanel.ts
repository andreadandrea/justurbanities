import type { GameState } from "../game/GameState";
import type { QuestManager } from "../game/quest/QuestManager";
import type { SyncQueue } from "../sync/SyncQueue";
import type { LocalDatabase } from "../storage/LocalDatabase";

type DebugPanelDeps = {
  root: HTMLElement;
  gameState: GameState;
  questManager: QuestManager;
  syncQueue: SyncQueue;
  db: LocalDatabase;
  sessionId: string;
};

const REFRESH_MS = 500;

/**
 * Local debug overlay (Task 3). Toggled with the on-screen button, F3 or backtick.
 * Shows session, player position, resources, variables, active quests and the
 * pending sync queue; offers a "clear local database" reset.
 */
export class DebugPanel {
  private readonly panel: HTMLElement;
  private refreshTimer: number | null = null;

  constructor(private readonly deps: DebugPanelDeps) {
    this.panel = document.createElement("aside");
    this.panel.className = "debug-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Debug panel");
    deps.root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "debug-toggle";
    toggle.textContent = "🐞 Debug";
    toggle.title = "Toggle debug panel (F3 or `)";
    toggle.addEventListener("click", () => this.toggle());
    deps.root.appendChild(toggle);

    window.addEventListener("keydown", (event) => {
      if (event.key === "F3" || event.key === "`") {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  toggle(): void {
    this.panel.hidden = !this.panel.hidden;
    if (!this.panel.hidden) {
      void this.refresh();
      this.refreshTimer = window.setInterval(() => void this.refresh(), REFRESH_MS);
    } else if (this.refreshTimer !== null) {
      window.clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async refresh(): Promise<void> {
    const { gameState, questManager, syncQueue, sessionId } = this.deps;
    const pending = await syncQueue.pending();

    this.panel.replaceChildren(
      this.section("Session", [sessionId]),
      this.section("Player", [
        `name: ${gameState.playerName || "(unset)"} (${gameState.playerPronoun})`,
        `x: ${Math.round(gameState.player.x)}  y: ${Math.round(gameState.player.y)}`,
        `scene: ${gameState.currentScene}`,
        `character: ${gameState.currentCharacter}`
      ]),
      this.section(
        "Resources",
        Object.entries(gameState.resources).map(([key, value]) => `${key}: ${value}`)
      ),
      this.section(
        "Variables",
        Object.keys(gameState.variables).length
          ? Object.entries(gameState.variables).map(([key, value]) => `${key} = ${String(value)}`)
          : ["(none)"]
      ),
      this.section(
        "Active quests",
        questManager.getActiveQuests().flatMap((quest) => [
          `${quest.id} — ${quest.title}`,
          ...quest.objectives.map((o) => `  ${o.completed ? "✓" : "·"} ${o.id}`)
        ]),
        ["(none)"]
      ),
      this.section(
        `Sync queue (${pending.length} pending)`,
        pending.slice(0, 8).map((item) => `${item.entityType}/${item.operation} ${item.entityId.slice(0, 8)}…`),
        ["(empty)"]
      ),
      this.clearButton()
    );
  }

  private section(title: string, lines: string[], emptyFallback: string[] = []): HTMLElement {
    const box = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = title;
    box.appendChild(heading);
    for (const line of lines.length ? lines : emptyFallback) {
      const row = document.createElement("div");
      row.textContent = line;
      box.appendChild(row);
    }
    return box;
  }

  private clearButton(): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "debug-clear";
    button.textContent = "Clear local database";
    button.addEventListener("click", () => {
      if (!window.confirm("Delete the local database (saves, events, sync queue) and reload?")) return;
      void this.deps.db.delete().then(() => window.location.reload());
    });
    return button;
  }
}
