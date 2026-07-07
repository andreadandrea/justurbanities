import type { SyncQueueItem } from "../storage/LocalDatabase";
import type { RemoteApiAdapter, RemoteApiResult } from "./RemoteApiClient";

/**
 * MP-2 (SPEC_Multiplayer §2.4): Supabase adapter over the PostgREST API.
 * Plain fetch, no SDK — the bundle stays lean and the adapter interface
 * stays swappable (any REST backend can replace it). Rows land in
 * `session_events(session_code, player_id, entity_id, type, payload, ts)`
 * with Row Level Security keyed by the session code. Gameplay never
 * depends on this: a failed push simply leaves the item in the queue and
 * the SyncEngine retries when the network returns.
 */

export type SupabaseConfig = {
  /** Project base URL, e.g. https://xyz.supabase.co (EU region project). */
  url: string;
  /** anon key — safe to ship, RLS does the real gatekeeping. */
  anonKey: string;
  /** 6-char classroom session code (SessionModel). */
  sessionCode: string;
  /** Pseudonymous device key for this player (SessionModel). */
  playerId: string;
};

export type FetchLike = (input: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "status">>;

export const SESSION_EVENTS_TABLE = "session_events";

export class SupabaseRemoteApi implements RemoteApiAdapter {
  readonly mode = "rest" as const;

  constructor(
    private readonly config: SupabaseConfig,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init)
  ) {}

  async push(item: SyncQueueItem): Promise<RemoteApiResult> {
    const row = {
      session_code: this.config.sessionCode,
      player_id: this.config.playerId,
      entity_type: item.entityType,
      entity_id: item.entityId,
      operation: item.operation,
      payload: item.payload,
      ts: item.createdAt
    };
    try {
      const response = await this.fetchImpl(
        `${this.config.url.replace(/\/$/, "")}/rest/v1/${SESSION_EVENTS_TABLE}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            apikey: this.config.anonKey,
            authorization: `Bearer ${this.config.anonKey}`,
            // Duplicate entity ids are replays: the server keeps the first.
            prefer: "resolution=ignore-duplicates"
          },
          body: JSON.stringify(row)
        }
      );
      return response.ok ? { ok: true } : { ok: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
