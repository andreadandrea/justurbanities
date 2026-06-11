import Dexie, { type Table } from "dexie";
import type { SerializableGameState } from "../game/GameState";

export type LocalSession = {
  id: string;
  userId: string;
  scenarioId: string;
  startedAt: string;
  updatedAt: string;
};

export type LocalSaveGame = {
  id: string;
  sessionId: string;
  userId: string;
  state: SerializableGameState;
  updatedAt: string;
};

export type ProgressEvent = {
  id: string;
  sessionId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  synced: number;
};

export type SyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: Record<string, unknown>;
  status: "pending" | "syncing" | "synced" | "failed";
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export class LocalDatabase extends Dexie {
  sessions!: Table<LocalSession, string>;
  savegames!: Table<LocalSaveGame, string>;
  progress_events!: Table<ProgressEvent, string>;
  sync_queue!: Table<SyncQueueItem, string>;

  constructor() {
    super("justurbanities_local_db");
    this.version(1).stores({
      sessions: "id, userId, scenarioId, updatedAt",
      savegames: "id, sessionId, userId, updatedAt",
      progress_events: "id, sessionId, userId, type, createdAt, synced",
      sync_queue: "id, entityType, entityId, status, updatedAt"
    });
  }

  async openDatabase(): Promise<void> {
    await this.open();
  }
}
