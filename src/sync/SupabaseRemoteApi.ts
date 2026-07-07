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

/**
 * MP-4: read the ordered session log (facilitator dashboard). Returns the
 * raw rows mapped to CityReducer-shaped events; throws on HTTP errors so
 * the dashboard can show a retry state.
 */
export async function fetchSessionEvents(
  config: Pick<SupabaseConfig, "url" | "anonKey" | "sessionCode">,
  fetchImpl: (input: string, init?: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">> = (
    input,
    init
  ) => fetch(input, init)
): Promise<Array<{ id: string; userId: string; type: string; payload: Record<string, unknown>; createdAt: string }>> {
  const base = config.url.replace(/\/$/, "");
  const query = `session_code=eq.${encodeURIComponent(config.sessionCode)}&order=seq.asc&select=entity_id,player_id,payload,ts`;
  const response = await fetchImpl(`${base}/rest/v1/${SESSION_EVENTS_TABLE}?${query}`, {
    headers: { apikey: config.anonKey, authorization: `Bearer ${config.anonKey}` }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const rows = (await response.json()) as Array<{
    entity_id: string;
    player_id: string;
    payload: Record<string, unknown>;
    ts: string;
  }>;
  // The queue pushes the whole ProgressEvent as the row payload
  // ({type, payload, createdAt, ...}) — unwrap it for the reducer.
  return rows.map((row) => {
    const progressEvent = row.payload as { type?: string; payload?: Record<string, unknown>; createdAt?: string };
    return {
      id: row.entity_id,
      userId: row.player_id,
      type: String(progressEvent.type ?? ""),
      payload: progressEvent.payload ?? {},
      createdAt: String(progressEvent.createdAt ?? row.ts)
    };
  });
}

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
