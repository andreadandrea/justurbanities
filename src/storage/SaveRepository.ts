import { v4 as uuid } from "uuid";
import type { SerializableGameState } from "../game/GameState";
import type { LocalDatabase, LocalSaveGame, LocalSession } from "./LocalDatabase";

export class SaveRepository {
  constructor(private readonly db: LocalDatabase) {}

  async loadOrCreateSession(userId: string, scenarioId: string): Promise<LocalSession> {
    const existing = await this.db.sessions.where({ userId, scenarioId }).last();
    if (existing) return existing;

    const now = new Date().toISOString();
    const session: LocalSession = {
      id: uuid(),
      userId,
      scenarioId,
      startedAt: now,
      updatedAt: now
    };
    await this.db.sessions.add(session);
    return session;
  }

  async loadLatestSave(sessionId: string): Promise<LocalSaveGame | undefined> {
    return this.db.savegames.where({ sessionId }).last();
  }

  async save(userId: string, sessionId: string, state: SerializableGameState): Promise<LocalSaveGame> {
    const now = new Date().toISOString();
    const existing = await this.loadLatestSave(sessionId);
    const save: LocalSaveGame = {
      id: existing?.id ?? uuid(),
      userId,
      sessionId,
      state,
      updatedAt: now
    };
    await this.db.savegames.put(save);
    return save;
  }
}
