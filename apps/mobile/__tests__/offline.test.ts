/**
 * Unit tests for offline persistence module
 * Spec: 016-mobile-app (T036)
 */
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { mmkvPersister, getCacheSize, clearCache, storage } from "../lib/offline";

/** Helper to create a valid PersistedClient shape for testing */
function mockClient(data: Record<string, unknown>): PersistedClient {
  return {
    timestamp: Date.now(),
    buster: "",
    clientState: {
      queries: [],
      mutations: [],
      ...data,
    },
  } as PersistedClient;
}

describe("offline module", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  describe("mmkvPersister", () => {
    it("persists and restores client state", () => {
      const client = mockClient({
        queries: [{ queryKey: ["events"], state: { data: { events: [] } } }],
      });

      mmkvPersister.persistClient(client);
      const restored = mmkvPersister.restoreClient();
      expect(restored).toEqual(client);
    });

    it("returns undefined when no state persisted", () => {
      const restored = mmkvPersister.restoreClient();
      expect(restored).toBeUndefined();
    });

    it("removes client state", () => {
      mmkvPersister.persistClient(mockClient({ version: 1 }));
      mmkvPersister.removeClient();
      expect(mmkvPersister.restoreClient()).toBeUndefined();
    });

    it("overwrites existing state", () => {
      const v1 = mockClient({ version: 1 });
      const v2 = mockClient({ version: 2 });
      mmkvPersister.persistClient(v1);
      mmkvPersister.persistClient(v2);
      const restored = mmkvPersister.restoreClient();
      expect(restored).toEqual(v2);
    });
  });

  describe("clearCache", () => {
    it("removes all cached data", () => {
      mmkvPersister.persistClient(mockClient({ data: "test" }));
      clearCache();
      expect(mmkvPersister.restoreClient()).toBeUndefined();
    });
  });
});
