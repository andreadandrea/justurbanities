import type { AuthConfig, SupabaseAuth } from "./SupabaseAuth";

/**
 * Cross-device resume (accounts decision, 2026-07-07): one save snapshot
 * per user in `player_saves`, guarded by RLS (auth.uid() = user_id).
 * Plain PostgREST upsert/select with the user's JWT — no SDK.
 * See docs/mp/player_saves.sql for the table.
 */

export type CloudSaveRow = {
  snapshot: Record<string, unknown>;
  updated_at: string;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

const TABLE = "player_saves";

function headers(config: AuthConfig, accessToken: string): Record<string, string> {
  return {
    "content-type": "application/json",
    apikey: config.anonKey,
    authorization: `Bearer ${accessToken}`
  };
}

export class CloudSaves {
  constructor(
    private readonly config: AuthConfig,
    private readonly auth: SupabaseAuth,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init)
  ) {}

  private base(): string {
    return this.config.url.replace(/\/$/, "");
  }

  /** Upload (upsert) the player's snapshot. Returns false on any failure. */
  async push(snapshot: Record<string, unknown>): Promise<boolean> {
    const user = this.auth.currentUser;
    const token = this.auth.accessToken;
    if (!user || !token) return false;
    try {
      const response = await this.fetchImpl(`${this.base()}/rest/v1/${TABLE}?on_conflict=user_id`, {
        method: "POST",
        headers: { ...headers(this.config, token), prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ user_id: user.id, snapshot, updated_at: new Date().toISOString() })
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /** Download the player's snapshot, or null when none exists. */
  async pull(): Promise<CloudSaveRow | null> {
    const user = this.auth.currentUser;
    const token = this.auth.accessToken;
    if (!user || !token) return null;
    try {
      const response = await this.fetchImpl(
        `${this.base()}/rest/v1/${TABLE}?user_id=eq.${encodeURIComponent(user.id)}&select=snapshot,updated_at&limit=1`,
        { headers: headers(this.config, token) }
      );
      if (!response.ok) return null;
      const rows = (await response.json()) as CloudSaveRow[];
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }
}
