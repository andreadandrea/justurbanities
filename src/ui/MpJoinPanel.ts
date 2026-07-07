import { isValidSessionCode, createPlayer } from "../game/mp/SessionModel";
import type { MpJoinInfo } from "../game/mp/MpConfig";
import type { I18n } from "../i18n/I18n";

type MpJoinPanelDeps = {
  root: HTMLElement;
  i18n: I18n;
  /** Already-joined session, if any (Dexie settings). */
  joined?: MpJoinInfo;
  /** Playable character id — recorded with the pseudonymous player. */
  character: () => string;
  onJoin: (info: MpJoinInfo) => void;
};

/**
 * MP-2 join-by-code UI. Only mounted when the `?mp=1` flag is on. Joined:
 * a small badge with the session code. Not joined: code + display name
 * form (client-side code validation; the server's RLS is the real gate).
 */
export class MpJoinPanel {
  constructor(deps: MpJoinPanelDeps) {
    const { root, i18n } = deps;

    const panel = document.createElement("aside");
    panel.className = "mp-join-panel";
    panel.setAttribute("aria-label", "Multiplayer");

    if (deps.joined) {
      const badge = document.createElement("span");
      badge.className = "mp-badge";
      badge.textContent = `${i18n.t("ui.mp.joinedAs")} ${deps.joined.displayName} · ${deps.joined.code}`;
      panel.appendChild(badge);
      root.appendChild(panel);
      return;
    }

    const title = document.createElement("h3");
    title.textContent = i18n.t("ui.mp.title");

    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.maxLength = 6;
    codeInput.placeholder = i18n.t("ui.mp.codePlaceholder");
    codeInput.autocapitalize = "characters";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 24;
    nameInput.placeholder = i18n.t("ui.mp.namePlaceholder");

    const error = document.createElement("p");
    error.className = "mp-error";
    error.hidden = true;

    const join = document.createElement("button");
    join.type = "button";
    join.textContent = i18n.t("ui.mp.join");
    join.addEventListener("click", () => {
      const code = codeInput.value.trim().toUpperCase();
      const displayName = nameInput.value.trim();
      if (!isValidSessionCode(code) || displayName.length === 0) {
        error.textContent = i18n.t("ui.mp.invalid");
        error.hidden = false;
        return;
      }
      const player = createPlayer(displayName, deps.character());
      deps.onJoin({ code, displayName, playerId: player.playerId });
      panel.remove();
    });

    panel.append(title, codeInput, nameInput, join, error);
    root.appendChild(panel);
  }
}
