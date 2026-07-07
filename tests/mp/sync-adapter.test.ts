import { describe, expect, it } from "vitest";
import { SupabaseRemoteApi, SESSION_EVENTS_TABLE, type FetchLike } from "../../src/sync/SupabaseRemoteApi";
import { chooseRemoteAdapter, mpEnabled } from "../../src/game/mp/MpConfig";
import { createRemoteApi } from "../../src/sync/RemoteApiClient";
import type { SyncQueueItem } from "../../src/storage/LocalDatabase";

const CONFIG = {
  url: "https://eu-project.supabase.co/",
  anonKey: "anon-key",
  sessionCode: "ABC234",
  playerId: "player-a"
};

function queueItem(): SyncQueueItem {
  return {
    id: "q1",
    entityType: "progress_event",
    entityId: "e1",
    operation: "create",
    payload: { type: "resource_delta", key: "voice", value: 1 },
    status: "pending",
    attempts: 0,
    createdAt: "2026-07-07T10:00:00.000Z",
    updatedAt: "2026-07-07T10:00:00.000Z"
  };
}

describe("MP-2 SupabaseRemoteApi (SPEC_Multiplayer §2.4)", () => {
  it("POSTs the queue item as a session_events row with RLS headers", async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const fetchOk: FetchLike = async (input, init) => {
      calls.push({ input, init });
      return { ok: true, status: 201 };
    };
    const api = new SupabaseRemoteApi(CONFIG, fetchOk);
    const result = await api.push(queueItem());

    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe(`https://eu-project.supabase.co/rest/v1/${SESSION_EVENTS_TABLE}`);
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.apikey).toBe("anon-key");
    expect(headers.authorization).toBe("Bearer anon-key");
    expect(headers.prefer).toContain("ignore-duplicates");
    const row = JSON.parse(String(calls[0].init?.body));
    expect(row).toEqual({
      session_code: "ABC234",
      player_id: "player-a",
      entity_type: "progress_event",
      entity_id: "e1",
      operation: "create",
      payload: { type: "resource_delta", key: "voice", value: 1 },
      ts: "2026-07-07T10:00:00.000Z"
    });
  });

  it("maps HTTP errors and network failures to ok:false (queue keeps the item)", async () => {
    const http500: FetchLike = async () => ({ ok: false, status: 500 });
    expect(await new SupabaseRemoteApi(CONFIG, http500).push(queueItem())).toEqual({
      ok: false,
      error: "HTTP 500"
    });

    const offline: FetchLike = async () => {
      throw new Error("network down");
    };
    expect(await new SupabaseRemoteApi(CONFIG, offline).push(queueItem())).toEqual({
      ok: false,
      error: "network down"
    });
  });
});

describe("MP-2 adapter selection (zero network with the flag off)", () => {
  const joined = { code: "ABC234", displayName: "Kim", playerId: "player-a" };
  const env = { supabaseUrl: "https://eu-project.supabase.co", supabaseAnonKey: "anon-key" };

  it("?mp=1 parses strictly", () => {
    expect(mpEnabled("?mp=1")).toBe(true);
    expect(mpEnabled("?mp=0")).toBe(false);
    expect(mpEnabled("")).toBe(false);
    expect(mpEnabled("?debug=1")).toBe(false);
  });

  it("flag off → fake adapter, even when joined and configured", () => {
    expect(chooseRemoteAdapter("", joined, env)).toEqual({ kind: "fake" });
  });

  it("flag on but not joined or not configured → still fake", () => {
    expect(chooseRemoteAdapter("?mp=1", undefined, env)).toEqual({ kind: "fake" });
    expect(chooseRemoteAdapter("?mp=1", joined, {})).toEqual({ kind: "fake" });
  });

  it("flag on + joined + configured → supabase with the session identity", () => {
    expect(chooseRemoteAdapter("?mp=1", joined, env)).toEqual({
      kind: "supabase",
      config: {
        url: "https://eu-project.supabase.co",
        anonKey: "anon-key",
        sessionCode: "ABC234",
        playerId: "player-a"
      }
    });
  });

  it("the fake adapter never touches fetch (single player stays offline)", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls += 1;
      return new Response();
    }) as typeof fetch;
    try {
      const fake = createRemoteApi("fake", { latencyMs: 0 });
      await fake.push(queueItem());
      expect(fetchCalls).toBe(0);
      expect(fake.pushed).toHaveLength(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
