import { describe, expect, it } from "vitest";
import { SupabaseAuth, type AuthSession } from "../../src/sync/SupabaseAuth";
import { CloudSaves } from "../../src/sync/CloudSaves";
import { buildMyContribution } from "../../src/game/report/PlayerSummary";
import type { CityEvent } from "../../src/game/mp/CityReducer";

const CONFIG = { url: "https://eu-project.supabase.co", anonKey: "publishable-key" };

function memoryStorage() {
  let stored: AuthSession | undefined;
  return {
    load: async () => stored,
    save: async (session: AuthSession | undefined) => {
      stored = session;
    },
    peek: () => stored
  };
}

const SESSION_BODY = {
  access_token: "jwt-token",
  refresh_token: "refresh-1",
  expires_in: 3600,
  user: { id: "user-1", email: "student@example.eu", user_metadata: { display_name: "Sam" } }
};

function fetchStub(responses: Array<{ ok: boolean; status: number; body?: unknown }>) {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const impl = async (input: string, init?: RequestInit) => {
    calls.push({ input, init });
    const next = responses.shift() ?? { ok: true, status: 200, body: {} };
    return { ok: next.ok, status: next.status, json: async () => next.body ?? {} };
  };
  return { impl, calls };
}

describe("SupabaseAuth — accounts over plain fetch (ratified 2026-07-07)", () => {
  it("signs up and persists the session (display name in metadata)", async () => {
    const storage = memoryStorage();
    const { impl, calls } = fetchStub([{ ok: true, status: 200, body: SESSION_BODY }]);
    const auth = new SupabaseAuth(CONFIG, storage, impl, () => 1_000_000);

    const result = await auth.signUp("student@example.eu", "secret123", "Sam");
    expect(result.ok).toBe(true);
    expect(auth.currentUser).toMatchObject({ id: "user-1", displayName: "Sam" });
    expect(storage.peek()?.refreshToken).toBe("refresh-1");
    expect(calls[0].input).toBe(`${CONFIG.url}/auth/v1/signup`);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.data.display_name).toBe("Sam");
  });

  it("reports needsConfirmation when the project requires email confirm", async () => {
    const storage = memoryStorage();
    const { impl } = fetchStub([{ ok: true, status: 200, body: { user: { id: "user-1" } } }]);
    const auth = new SupabaseAuth(CONFIG, storage, impl);
    const result = await auth.signUp("student@example.eu", "secret123", "Sam");
    expect(result).toMatchObject({ ok: true, session: null, needsConfirmation: true });
    expect(auth.currentUser).toBeNull();
  });

  it("restore refreshes an expired session and clears a rejected one", async () => {
    const storage = memoryStorage();
    await storage.save({
      accessToken: "old",
      refreshToken: "refresh-1",
      expiresAt: 900, // already expired vs now=1_000_000ms → 1000s
      user: { id: "user-1", email: "e", displayName: "Sam" }
    });
    const { impl } = fetchStub([{ ok: true, status: 200, body: SESSION_BODY }]);
    const auth = new SupabaseAuth(CONFIG, storage, impl, () => 1_000_000);
    const user = await auth.restore();
    expect(user?.id).toBe("user-1");
    expect(auth.accessToken).toBe("jwt-token");

    // rejected refresh clears everything (bad token → signed out)
    const storage2 = memoryStorage();
    await storage2.save({
      accessToken: "old",
      refreshToken: "dead",
      expiresAt: 900,
      user: { id: "user-1", email: "e", displayName: "Sam" }
    });
    const failing = fetchStub([{ ok: false, status: 401, body: { error_description: "invalid" } }]);
    const auth2 = new SupabaseAuth(CONFIG, storage2, failing.impl, () => 1_000_000);
    expect(await auth2.restore()).toBeNull();
    expect(storage2.peek()).toBeUndefined();
  });

  it("sign-in failures surface the server message, not an exception", async () => {
    const { impl } = fetchStub([{ ok: false, status: 400, body: { error_description: "Invalid login credentials" } }]);
    const auth = new SupabaseAuth(CONFIG, memoryStorage(), impl);
    const result = await auth.signIn("student@example.eu", "wrong");
    expect(result).toEqual({ ok: false, error: "Invalid login credentials" });
  });
});

describe("CloudSaves — cross-device resume", () => {
  async function signedInAuth() {
    const { impl } = fetchStub([{ ok: true, status: 200, body: SESSION_BODY }]);
    const auth = new SupabaseAuth(CONFIG, memoryStorage(), impl);
    await auth.signIn("student@example.eu", "secret123");
    return auth;
  }

  it("push upserts the snapshot under the user's JWT", async () => {
    const auth = await signedInAuth();
    const { impl, calls } = fetchStub([{ ok: true, status: 201 }]);
    const saves = new CloudSaves(CONFIG, auth, impl);
    expect(await saves.push({ day: 3 })).toBe(true);
    expect(calls[0].input).toContain("/rest/v1/player_saves?on_conflict=user_id");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer jwt-token");
    expect(headers.prefer).toContain("merge-duplicates");
    expect(JSON.parse(String(calls[0].init?.body)).user_id).toBe("user-1");
  });

  it("pull returns the snapshot or null; signed-out users get nothing", async () => {
    const auth = await signedInAuth();
    const { impl } = fetchStub([
      { ok: true, status: 200, body: [{ snapshot: { day: 3 }, updated_at: "2026-07-07T10:00:00Z" }] }
    ]);
    const saves = new CloudSaves(CONFIG, auth, impl);
    expect((await saves.pull())?.snapshot).toEqual({ day: 3 });

    const signedOut = new SupabaseAuth(CONFIG, memoryStorage(), fetchStub([]).impl);
    const noSaves = new CloudSaves(CONFIG, signedOut, fetchStub([]).impl);
    expect(await noSaves.pull()).toBeNull();
    expect(await noSaves.push({})).toBe(false);
  });
});

describe("buildMyContribution — the personal slice of the shared city", () => {
  const events: CityEvent[] = [
    { id: "e1", userId: "user-1", type: "resource_delta", payload: { key: "trust", value: 2 }, createdAt: "1" },
    { id: "e2", userId: "user-1", type: "resource_delta", payload: { key: "trust", value: -1 }, createdAt: "2" },
    { id: "e3", userId: "user-2", type: "resource_delta", payload: { key: "care", value: 3 }, createdAt: "3" },
    { id: "e4", userId: "user-1", type: "quest_completed", payload: { questId: "N05" }, createdAt: "4" },
    { id: "e5", userId: "user-2", type: "quest_completed", payload: { questId: "N05" }, createdAt: "5" },
    { id: "e6", userId: "user-1", type: "promise_kept", payload: { promiseId: "promiseRepairDay" }, createdAt: "6" },
    { id: "e7", userId: "user-1", type: "empathy_map", payload: { who: "viveca", posture: "ask" }, createdAt: "7" }
  ];

  it("sums my deltas, credits first-completions, counts my promises", () => {
    const mine = buildMyContribution("user-1", events);
    expect(mine.events).toBe(5);
    expect(mine.resourcesContributed).toEqual({ trust: 1 });
    expect(mine.questsCompleted).toEqual(["N05"]); // first event wins
    expect(mine.empathyMaps).toEqual(["viveca"]);
    expect(mine.promisesKept).toBe(1);
    expect(mine.classTotals).toEqual({ players: 2, events: 7, questsCompleted: 1 });
  });

  it("the second finisher does not get the quest credit", () => {
    const other = buildMyContribution("user-2", events);
    expect(other.questsCompleted).toEqual([]);
    expect(other.resourcesContributed).toEqual({ care: 3 });
  });
});
