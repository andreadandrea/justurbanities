import type { SyncQueueItem } from "../storage/LocalDatabase";
import type { RemoteApiAdapter } from "./RemoteApiClient";

/** Structural dependency so the engine can be tested without IndexedDB. */
export type SyncQueueLike = {
  pending(): Promise<SyncQueueItem[]>;
  markSynced(id: string): Promise<void>;
  markFailed(id: string, attempts: number): Promise<void>;
};

export class SyncEngine {
  private intervalId: number | undefined;

  constructor(
    private readonly queue: SyncQueueLike,
    private readonly api: RemoteApiAdapter
  ) {}

  start(): void {
    window.addEventListener("online", () => void this.syncOnce());
    this.intervalId = window.setInterval(() => void this.syncOnce(), 15000);
    void this.syncOnce();
  }

  stop(): void {
    if (this.intervalId) window.clearInterval(this.intervalId);
  }

  async syncOnce(): Promise<void> {
    if (!navigator.onLine) return;

    const pending = await this.queue.pending();
    for (const item of pending) {
      const result = await this.api.push(item);
      if (result.ok) {
        await this.queue.markSynced(item.id);
      } else {
        await this.queue.markFailed(item.id, item.attempts + 1);
      }
    }
  }
}
