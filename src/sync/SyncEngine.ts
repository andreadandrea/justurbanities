import { SyncQueue } from "./SyncQueue";

export class SyncEngine {
  private intervalId: number | undefined;

  constructor(private readonly queue: SyncQueue) {}

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
      try {
        // Remote API placeholder.
        await new Promise((resolve) => setTimeout(resolve, 50));
        await this.queue.markSynced(item.id);
      } catch {
        await this.queue.markFailed(item.id, item.attempts + 1);
      }
    }
  }
}
