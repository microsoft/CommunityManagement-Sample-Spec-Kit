/**
 * Offline persistence module — MMKV-backed TanStack Query persister
 * Spec: 016-mobile-app (T038)
 *
 * Constitution VI: Performance — MMKV for fast reads (< 10ms)
 * Cache size limit: 50MB with LRU eviction
 */
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { MMKV } from "react-native-mmkv";

const CACHE_KEY_PREFIX = "tq_cache_";
const METADATA_KEY = "tq_cache_metadata";
const MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const storage = new MMKV({ id: "tanstack-query-cache" });

interface CacheMetadata {
  entries: Array<{
    key: string;
    size: number;
    accessedAt: number;
  }>;
  totalSize: number;
}

function getMetadata(): CacheMetadata {
  const raw = storage.getString(METADATA_KEY);
  if (!raw) return { entries: [], totalSize: 0 };
  try {
    return JSON.parse(raw) as CacheMetadata;
  } catch {
    return { entries: [], totalSize: 0 };
  }
}

function saveMetadata(metadata: CacheMetadata): void {
  storage.set(METADATA_KEY, JSON.stringify(metadata));
}

function evictLRU(
  metadata: CacheMetadata,
  neededBytes: number,
): CacheMetadata {
  const sorted = [...metadata.entries].sort(
    (a, b) => a.accessedAt - b.accessedAt,
  );

  let freedBytes = 0;
  const toRemove: string[] = [];

  for (const entry of sorted) {
    if (metadata.totalSize - freedBytes + neededBytes <= MAX_CACHE_SIZE_BYTES) {
      break;
    }
    freedBytes += entry.size;
    toRemove.push(entry.key);
  }

  for (const key of toRemove) {
    storage.delete(CACHE_KEY_PREFIX + key);
  }

  return {
    entries: metadata.entries.filter((e) => !toRemove.includes(e.key)),
    totalSize: metadata.totalSize - freedBytes,
  };
}

/**
 * Estimate size of a string in bytes (UTF-8)
 */
function byteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else bytes += 3;
  }
  return bytes;
}

/**
 * TanStack Query persister compatible interface
 */
export const mmkvPersister: Persister = {
  persistClient(client: PersistedClient): void {
    const data = JSON.stringify(client);
    const key = "client_state";
    const size = byteLength(data);

    let metadata = getMetadata();

    // Evict if needed
    if (metadata.totalSize + size > MAX_CACHE_SIZE_BYTES) {
      metadata = evictLRU(metadata, size);
    }

    storage.set(CACHE_KEY_PREFIX + key, data);

    // Update metadata
    const existingIdx = metadata.entries.findIndex((e) => e.key === key);
    if (existingIdx >= 0) {
      metadata.totalSize -= metadata.entries[existingIdx].size;
      metadata.entries[existingIdx] = { key, size, accessedAt: Date.now() };
    } else {
      metadata.entries.push({ key, size, accessedAt: Date.now() });
    }
    metadata.totalSize += size;
    saveMetadata(metadata);
  },

  restoreClient(): PersistedClient | undefined {
    const data = storage.getString(CACHE_KEY_PREFIX + "client_state");
    if (!data) return undefined;

    // Update access time
    const metadata = getMetadata();
    const entry = metadata.entries.find((e) => e.key === "client_state");
    if (entry) {
      entry.accessedAt = Date.now();
      saveMetadata(metadata);
    }

    try {
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  },

  removeClient(): void {
    storage.delete(CACHE_KEY_PREFIX + "client_state");
    const metadata = getMetadata();
    metadata.entries = metadata.entries.filter(
      (e) => e.key !== "client_state",
    );
    saveMetadata(metadata);
  },
};

/**
 * Get current cache size in bytes
 */
export function getCacheSize(): number {
  return getMetadata().totalSize;
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  storage.clearAll();
}
