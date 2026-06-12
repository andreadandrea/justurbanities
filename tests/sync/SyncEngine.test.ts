import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncEngine, type SyncQueueLike } from "../../src/sync/SyncEngine";
import { FakeRemoteApi, createRemoteApi } from "../../src/sync/RemoteApiClient";
import type { SyncQueueItem } from "../../src/storage/LocalDatabase";

function makeItem(id: string): SyncQueueItem {
  const now = new Date().toISOString();
  return {
    id,
    entityType: "progress_event",
    entityId: `entity-${id}`,
    operation: "create",
    payload: { id },
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now
  };
}

/** In-memory stand-in for the IndexedDB-backed SyncQueue. */
function makeQueue(items: SyncQueueItem[]): SyncQueueLike & { items: SyncQueueItem[] } {
  return {
    items,
    async pending() {
      return this.items.filter((item) => item.status === "pending");
    },
    async markSynced(id: string) {
      const item = this.items.find((i) => i.id === id);
      if (item) item.status = "synced";
    },
    async markFailed(id: string, attempts: number) {
      const item = this.items.find((i) => i.id === id);
      if (item) {
        item.status = "failed";
        item.attempts = attempts;
      }
    }
  };
}

beforeEach(() => {
  vi.stubGlobal("navigator", { onLine: true });
});

describe("SyncEngine + RemoteApiClient (fake mode)", () => {
  it("pushes every pending item and marks it synced", async () => {
    const queue = makeQueue([makeItem("a"), makeItem("b")]);
    const api = new FakeRemoteApi({ latencyMs: 0 });
    const engine = new SyncEngine(queue, api);

    await engine.syncOnce();

    expect(queue.items.map((i) => i.status)).toEqual(["synced", "synced"]);
    expect(api.pushed.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("marks items failed (with attempt count) when the remote rejects them", async () => {
    const queue = makeQueue([makeItem("a"), makeItem("b"), makeItem("c")]);
    const api = new FakeRemoteApi({ latencyMs: 0, failEvery: 2 });
    const engine = new SyncEngine(queue, api);

    await engine.syncOnce();

    expect(queue.items.map((i) => i.status)).toEqual(["synced", "failed", "synced"]);
    expect(queue.items[1].attempts).toBe(1);
  });

  it("does nothing while offline (offline-first: queue is preserved)", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const queue = makeQueue([makeItem("a")]);
    const api = new FakeRemoteApi({ latencyMs: 0 });
    const engine = new SyncEngine(queue, api);

    await engine.syncOnce();

    expect(queue.items[0].status).toBe("pending");
    expect(api.pushed).toHaveLength(0);
  });

  it("createRemoteApi builds the right adapter per mode", () => {
    expect(createRemoteApi("fake").mode).toBe("fake");
    expect(createRemoteApi("rest", "https://example.org/api").mode).toBe("rest");
  });
});
