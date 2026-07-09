import type { SupabaseAuth, AuthUser } from "../sync/SupabaseAuth";
import type { CloudSaves } from "../sync/CloudSaves";
import type { I18n } from "../i18n/I18n";

type AccountPanelDeps = {
  root: HTMLElement;
  i18n: I18n;
  auth: SupabaseAuth;
  cloudSaves: CloudSaves;
  /** Current save snapshot to upload. */
  snapshot: () => Record<string, unknown>;
  /** Apply a downloaded snapshot (restore + reload the world). */
  applySnapshot: (snapshot: Record<string, unknown>) => void;
  /** Fired on sign-in/out so MP identity can follow the account. */
  onAuthChanged: (user: AuthUser | null) => void;
  /** Privacy notice URL (GDPR — linked next to the registration form). */
  privacyUrl: string;
};

/**
 * Account (👤) — registration/login (accounts decision, 2026-07-07) plus
 * cloud save push/pull for cross-device resume. The single-player game
 * never requires it: the panel is additive, offline play stays intact.
 */
export class AccountPanel {
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private busy = false;

  constructor(private readonly deps: AccountPanelDeps) {
    this.panel = document.createElement("aside");
    this.panel.className = "account-panel";
    this.panel.hidden = true;
    this.panel.setAttribute("aria-label", "Account");
    this.body = document.createElement("div");
    this.panel.appendChild(this.body);
    deps.root.appendChild(this.panel);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "account-toggle";
    const renderToggle = () => {
      toggle.textContent = deps.i18n.t("ui.account.toggle");
      toggle.title = deps.i18n.t("ui.account.hint");
    };
    renderToggle();
    toggle.addEventListener("click", () => {
      this.panel.hidden = !this.panel.hidden;
      if (!this.panel.hidden) this.render();
    });
    deps.root.appendChild(toggle);
    deps.i18n.onChange(() => {
      renderToggle();
      if (!this.panel.hidden) this.render();
    });
  }

  render(status?: string): void {
    const { i18n, auth } = this.deps;
    this.body.replaceChildren();

    const title = document.createElement("h3");
    title.textContent = i18n.t("ui.account.title");
    this.body.appendChild(title);

    if (status) {
      const note = document.createElement("p");
      note.className = "account-status";
      note.textContent = status;
      this.body.appendChild(note);
    }

    const user = auth.currentUser;
    if (user) {
      this.renderSignedIn(user);
    } else {
      this.renderForms();
    }
  }

  private renderSignedIn(user: AuthUser): void {
    const { i18n } = this.deps;

    const who = document.createElement("p");
    who.className = "account-who";
    who.textContent = `${i18n.t("ui.account.signedInAs")} ${user.displayName || user.email}`;
    this.body.appendChild(who);

    const cloud = document.createElement("div");
    cloud.className = "account-actions";
    cloud.append(
      this.action(i18n.t("ui.account.pushSave"), async () => {
        const ok = await this.deps.cloudSaves.push(this.deps.snapshot());
        this.render(i18n.t(ok ? "ui.account.pushOk" : "ui.account.pushFail"));
      }),
      this.action(i18n.t("ui.account.pullSave"), async () => {
        const row = await this.deps.cloudSaves.pull();
        if (!row) {
          this.render(i18n.t("ui.account.pullNone"));
          return;
        }
        this.deps.applySnapshot(row.snapshot);
        this.render(i18n.t("ui.account.pullOk"));
      }),
      this.action(i18n.t("ui.account.signOut"), async () => {
        await this.deps.auth.signOut();
        this.deps.onAuthChanged(null);
        this.render();
      })
    );
    this.body.appendChild(cloud);
  }

  private renderForms(): void {
    const { i18n } = this.deps;

    const email = this.input("email", i18n.t("ui.account.email"));
    const password = this.input("password", i18n.t("ui.account.password"));
    const displayName = this.input("text", i18n.t("ui.account.displayName"));

    const form = document.createElement("form");
    form.className = "account-form";
    form.append(email.wrap, password.wrap, displayName.wrap);

    const actions = document.createElement("div");
    actions.className = "account-actions";
    const signIn = this.action(i18n.t("ui.account.signIn"), async () => {
      const result = await this.deps.auth.signIn(email.field.value.trim(), password.field.value);
      if (result.ok && result.session) {
        this.deps.onAuthChanged(result.session.user);
        this.render(i18n.t("ui.account.welcome"));
      } else {
        this.render(`${i18n.t("ui.account.error")}: ${result.ok ? "?" : result.error}`);
      }
    });
    const signUp = this.action(i18n.t("ui.account.signUp"), async () => {
      const result = await this.deps.auth.signUp(
        email.field.value.trim(),
        password.field.value,
        displayName.field.value.trim() || email.field.value.split("@")[0]
      );
      if (!result.ok) {
        this.render(`${i18n.t("ui.account.error")}: ${result.error}`);
      } else if (result.session) {
        this.deps.onAuthChanged(result.session.user);
        this.render(i18n.t("ui.account.welcome"));
      } else {
        this.render(i18n.t("ui.account.confirmEmail"));
      }
    });
    actions.append(signIn, signUp);
    form.appendChild(actions);
    form.addEventListener("submit", (event) => event.preventDefault());
    this.body.appendChild(form);

    const privacy = document.createElement("a");
    privacy.className = "account-privacy";
    privacy.href = this.deps.privacyUrl;
    privacy.target = "_blank";
    privacy.rel = "noopener";
    privacy.textContent = i18n.t("ui.account.privacy");
    this.body.appendChild(privacy);
  }

  private input(type: string, label: string): { wrap: HTMLElement; field: HTMLInputElement } {
    const wrap = document.createElement("label");
    wrap.className = "account-field";
    const caption = document.createElement("span");
    caption.textContent = label;
    const field = document.createElement("input");
    field.type = type;
    field.autocomplete = type === "password" ? "current-password" : type === "email" ? "email" : "username";
    wrap.append(caption, field);
    return { wrap, field };
  }

  private action(label: string, run: () => Promise<void>): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.addEventListener("click", () => {
      if (this.busy) return;
      this.busy = true;
      btn.disabled = true;
      void run().finally(() => {
        this.busy = false;
        btn.disabled = false;
      });
    });
    return btn;
  }
}
