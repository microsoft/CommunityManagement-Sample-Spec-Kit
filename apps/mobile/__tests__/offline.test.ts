/**
 * Unit tests for offline persistence module
 * Spec: 016-mobile-app (T036)
 */
import { mmkvPersister, getCacheSize, clearCache, storage } from "../lib/offline";

describe("offline module", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  describe("mmkvPersister", () => {
    it("persists and restores client state", () => {
      const clientState = {
        queries: [{ queryKey: ["events"], data: { events: [] } }],
      };

      mmkvPersister.persistClient(clientState);
      const restored = mmkvPersister.restoreClient();
      expect(restored).toEqual(clientState);
    });

    it("returns undefined when no state persisted", () => {
      const restored = mmkvPersister.restoreClient();
      expect(restored).toBeUndefined();
    });

    it("removes client state", () => {
      mmkvPersister.persistClient({ test: true });
      mmkvPersister.removeClient();
      expect(mmkvPersister.restoreClient()).toBeUndefined();
    });

    it("overwrites existing state", () => {
      mmkvPersister.persistClient({ version: 1 });
      mmkvPersister.persistClient({ version: 2 });
      const restored = mmkvPersister.restoreClient();
      expect(restored).toEqual({ version: 2 });
    });
  });

  describe("clearCache", () => {
    it("removes all cached data", () => {
      mmkvPersister.persistClient({ data: "test" });
      clearCache();
      expect(mmkvPersister.restoreClient()).toBeUndefined();
    });
  });
});
