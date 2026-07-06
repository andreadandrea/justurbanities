import type { LocalDatabase } from "./LocalDatabase";

/** Device-level settings (language, art-style variant, ...) on Dexie. */
export class SettingsRepository {
  constructor(private readonly db: LocalDatabase) {}

  async get<T>(key: string): Promise<T | undefined> {
    const row = await this.db.settings.get(key);
    return row?.value as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.db.settings.put({ key, value });
  }
}
