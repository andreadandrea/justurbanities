/**
 * Supabase Auth (GoTrue) over plain fetch — no SDK, same policy as the
 * PostgREST adapter. Accounts were ratified by Andrea on 2026-07-07
 * (supersedes SPEC_Multiplayer §2.5 "no accounts"): they give players a
 * recallable identity, the personal dashboard and cross-device resume.
 * The single-player game NEVER requires an account (offline-first rule).
 */

export type AuthConfig = {
  /** Project base URL, e.g. https://xyz.supabase.co */
  url: string;
  /** Publishable/anon key — public by design. */
  anonKey: string;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  /** Unix epoch seconds when the access token expires. */
  expiresAt: number;
  user: AuthUser;
};

export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: true; session: null; needsConfirmation: true }
  | { ok: false; error: string };

export type AuthStorage = {
  load(): Promise<AuthSession | undefined>;
  save(session: AuthSession | undefined): Promise<void>;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: { id?: string; email?: string; user_metadata?: { display_name?: string } };
  error?: string;
  error_description?: string;
  msg?: string;
};

function toUser(raw: TokenResponse["user"]): AuthUser {
  return {
    id: String(raw?.id ?? ""),
    email: String(raw?.email ?? ""),
    displayName: String(raw?.user_metadata?.display_name ?? raw?.email?.split("@")[0] ?? "")
  };
}

function toSession(raw: TokenResponse, now: () => number): AuthSession | null {
  if (!raw.access_token || !raw.refresh_token || !raw.user?.id) return null;
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    expiresAt: raw.expires_at ?? Math.floor(now() / 1000) + (raw.expires_in ?? 3600),
    user: toUser(raw.user)
  };
}

export class SupabaseAuth {
  private session: AuthSession | null = null;

  constructor(
    private readonly config: AuthConfig,
    private readonly storage: AuthStorage,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
    private readonly now: () => number = () => Date.now()
  ) {}

  get currentUser(): AuthUser | null {
    return this.session?.user ?? null;
  }

  get accessToken(): string | null {
    return this.session?.accessToken ?? null;
  }

  /** Restore the persisted session; refresh it when (nearly) expired. */
  async restore(): Promise<AuthUser | null> {
    const stored = await this.storage.load();
    if (!stored) return null;
    this.session = stored;
    const margin = 60; // refresh one minute early
    if (stored.expiresAt - margin <= Math.floor(this.now() / 1000)) {
      const refreshed = await this.refresh();
      if (!refreshed) return null;
    }
    return this.currentUser;
  }

  async signUp(email: string, password: string, displayName: string): Promise<AuthResult> {
    const raw = await this.post(`/auth/v1/signup`, {
      email,
      password,
      data: { display_name: displayName }
    });
    if ("error" in raw) return raw;
    const session = toSession(raw.body, this.now);
    if (!session) {
      // Project has email confirmation on: account created, session later.
      return { ok: true, session: null, needsConfirmation: true };
    }
    await this.setSession(session);
    return { ok: true, session };
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const raw = await this.post(`/auth/v1/token?grant_type=password`, { email, password });
    if ("error" in raw) return raw;
    const session = toSession(raw.body, this.now);
    if (!session) return { ok: false, error: "invalid_session" };
    await this.setSession(session);
    return { ok: true, session };
  }

  async signOut(): Promise<void> {
    const token = this.session?.accessToken;
    await this.setSession(null);
    if (!token) return;
    try {
      await this.fetchImpl(`${this.base()}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: this.config.anonKey, authorization: `Bearer ${token}` }
      });
    } catch {
      // Local sign-out already happened; the server token just expires.
    }
  }

  /** Exchange the refresh token; clears the session when it is rejected. */
  async refresh(): Promise<AuthSession | null> {
    const refreshToken = this.session?.refreshToken;
    if (!refreshToken) return null;
    const raw = await this.post(`/auth/v1/token?grant_type=refresh_token`, { refresh_token: refreshToken });
    if ("error" in raw) {
      await this.setSession(null);
      return null;
    }
    const session = toSession(raw.body, this.now);
    await this.setSession(session);
    return session;
  }

  private base(): string {
    return this.config.url.replace(/\/$/, "");
  }

  private async setSession(session: AuthSession | null): Promise<void> {
    this.session = session;
    await this.storage.save(session ?? undefined);
  }

  private async post(
    path: string,
    body: Record<string, unknown>
  ): Promise<{ body: TokenResponse } | { ok: false; error: string }> {
    try {
      const response = await this.fetchImpl(`${this.base()}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: this.config.anonKey },
        body: JSON.stringify(body)
      });
      const parsed = (await response.json().catch(() => ({}))) as TokenResponse;
      if (!response.ok) {
        return { ok: false, error: parsed.error_description ?? parsed.msg ?? parsed.error ?? `HTTP ${response.status}` };
      }
      return { body: parsed };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
