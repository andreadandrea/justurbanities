import { generateSessionCode } from "./SessionModel";
import type { AuthConfig, SupabaseAuth } from "../../sync/SupabaseAuth";

/**
 * Hardening v2 (2026-07-09): class sessions are owned by the teacher.
 * Creating one inserts a `sessions` row under the signed-in user; erasing
 * one deletes the whole event log and the row in one action (the GDPR
 * "erasable by the facilitator" requirement). Plain PostgREST, no SDK.
 */

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "status">>;

export class MpSessions {
  constructor(
    private readonly config: AuthConfig,
    private readonly auth: SupabaseAuth,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
    private readonly random: () => number = Math.random
  ) {}

  private base(): string {
    return this.config.url.replace(/\/$/, "");
  }

  private headers(): Record<string, string> | null {
    const token = this.auth.accessToken;
    if (!token) return null;
    return { "content-type": "application/json", apikey: this.config.anonKey, authorization: `Bearer ${token}` };
  }

  /** Create a class session owned by the signed-in teacher. */
  async create(): Promise<string | null> {
    const user = this.auth.currentUser;
    const headers = this.headers();
    if (!user || !headers) return null;
    const code = generateSessionCode(this.random);
    try {
      const response = await this.fetchImpl(`${this.base()}/rest/v1/sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ code, owner_id: user.id })
      });
      return response.ok ? code : null;
    } catch {
      return null;
    }
  }

  /** Erase a whole session (event log first, then the owning row). */
  async erase(code: string): Promise<boolean> {
    const headers = this.headers();
    if (!headers) return false;
    try {
      const events = await this.fetchImpl(
        `${this.base()}/rest/v1/session_events?session_code=eq.${encodeURIComponent(code)}`,
        { method: "DELETE", headers }
      );
      if (!events.ok) return false;
      const session = await this.fetchImpl(`${this.base()}/rest/v1/sessions?code=eq.${encodeURIComponent(code)}`, {
        method: "DELETE",
        headers
      });
      return session.ok;
    } catch {
      return false;
    }
  }
}
