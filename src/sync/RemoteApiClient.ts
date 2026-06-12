import type { SyncQueueItem } from "../storage/LocalDatabase";

export type RemoteApiMode = "fake" | "rest";

export type RemoteApiResult = { ok: true } | { ok: false; error: string };

/**
 * Adapter boundary between the offline sync queue and any remote backend.
 * Gameplay never depends on this: failures only leave items in the queue.
 * A Supabase adapter will be added later (see OFFLINE_FIRST_SYNC_SPEC.md).
 */
export interface RemoteApiAdapter {
  readonly mode: RemoteApiMode;
  push(item: SyncQueueItem): Promise<RemoteApiResult>;
}

export type FakeRemoteApiOptions = {
  /** Simulated network latency per push (default 50ms). */
  latencyMs?: number;
  /** Make every Nth push fail, to exercise the failure path (default: never). */
  failEvery?: number;
};

/** In-memory backend simulator: records pushed items, optional simulated failures. */
export class FakeRemoteApi implements RemoteApiAdapter {
  readonly mode = "fake" as const;
  readonly pushed: SyncQueueItem[] = [];
  private pushCount = 0;

  constructor(private readonly options: FakeRemoteApiOptions = {}) {}

  async push(item: SyncQueueItem): Promise<RemoteApiResult> {
    await new Promise((resolve) => setTimeout(resolve, this.options.latencyMs ?? 50));
    this.pushCount += 1;
    if (this.options.failEvery && this.pushCount % this.options.failEvery === 0) {
      return { ok: false, error: "Simulated network failure" };
    }
    this.pushed.push(structuredClone(item));
    return { ok: true };
  }
}

/** Minimal REST placeholder: POSTs each queue item to `<baseUrl>/sync`. */
export class RestRemoteApi implements RemoteApiAdapter {
  readonly mode = "rest" as const;

  constructor(private readonly baseUrl: string) {}

  async push(item: SyncQueueItem): Promise<RemoteApiResult> {
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item)
      });
      return response.ok ? { ok: true } : { ok: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

export function createRemoteApi(mode: "fake", options?: FakeRemoteApiOptions): FakeRemoteApi;
export function createRemoteApi(mode: "rest", baseUrl: string): RestRemoteApi;
export function createRemoteApi(
  mode: RemoteApiMode,
  optionsOrBaseUrl?: FakeRemoteApiOptions | string
): RemoteApiAdapter {
  if (mode === "rest") {
    if (typeof optionsOrBaseUrl !== "string") throw new Error("REST mode requires a base URL.");
    return new RestRemoteApi(optionsOrBaseUrl);
  }
  return new FakeRemoteApi(typeof optionsOrBaseUrl === "object" ? optionsOrBaseUrl : {});
}
