import { v4 as uuid } from "uuid";
import type { LocalDatabase, SyncQueueItem } from "../storage/LocalDatabase";

export class SyncQueue {
  constructor(private readonly db: LocalDatabase) {}

  async enqueue(
    entityType: string,
    entityId: string,
    operation: SyncQueueItem["operation"],
    payload: Record<string, unknown>
  ): Promise<SyncQueueItem> {
    const now = new Date().toISOString();
    const item: SyncQueueItem = {
      id: uuid(),
      entityType,
      entityId,
      operation,
      payload,
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now
    };
    await this.db.sync_queue.add(item);
    return item;
  }

  async pending(): Promise<SyncQueueItem[]> {
    return this.db.sync_queue.where("status").equals("pending").toArray();
  }

  async markSynced(id: string): Promise<void> {
    await this.db.sync_queue.update(id, {
      status: "synced",
      updatedAt: new Date().toISOString()
    });
  }

  async markFailed(id: string, attempts: number): Promise<void> {
    await this.db.sync_queue.update(id, {
      status: "failed",
      attempts,
      updatedAt: new Date().toISOString()
    });
  }
}
