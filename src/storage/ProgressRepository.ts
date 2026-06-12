import { v4 as uuid } from "uuid";
import type { LocalDatabase, ProgressEvent } from "./LocalDatabase";

export class ProgressRepository {
  constructor(private readonly db: LocalDatabase) {}

  async append(
    sessionId: string,
    userId: string,
    type: string,
    payload: Record<string, unknown>
  ): Promise<ProgressEvent> {
    const event: ProgressEvent = {
      id: uuid(),
      sessionId,
      userId,
      type,
      payload,
      createdAt: new Date().toISOString(),
      synced: 0
    };
    await this.db.progress_events.add(event);
    return event;
  }

  async listBySession(sessionId: string): Promise<ProgressEvent[]> {
    const events = await this.db.progress_events.where({ sessionId }).toArray();
    return events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
