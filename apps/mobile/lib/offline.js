"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mmkvPersister = exports.storage = void 0;
exports.getCacheSize = getCacheSize;
exports.clearCache = clearCache;
var react_native_mmkv_1 = require("react-native-mmkv");
var CACHE_KEY_PREFIX = "tq_cache_";
var METADATA_KEY = "tq_cache_metadata";
var MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
exports.storage = new react_native_mmkv_1.MMKV({ id: "tanstack-query-cache" });
function getMetadata() {
    var raw = exports.storage.getString(METADATA_KEY);
    if (!raw)
        return { entries: [], totalSize: 0 };
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        return { entries: [], totalSize: 0 };
    }
}
function saveMetadata(metadata) {
    exports.storage.set(METADATA_KEY, JSON.stringify(metadata));
}
function evictLRU(metadata, neededBytes) {
    var sorted = __spreadArray([], metadata.entries, true).sort(function (a, b) { return a.accessedAt - b.accessedAt; });
    var freedBytes = 0;
    var toRemove = [];
    for (var _i = 0, sorted_1 = sorted; _i < sorted_1.length; _i++) {
        var entry = sorted_1[_i];
        if (metadata.totalSize - freedBytes + neededBytes <= MAX_CACHE_SIZE_BYTES) {
            break;
        }
        freedBytes += entry.size;
        toRemove.push(entry.key);
    }
    for (var _a = 0, toRemove_1 = toRemove; _a < toRemove_1.length; _a++) {
        var key = toRemove_1[_a];
        exports.storage.delete(CACHE_KEY_PREFIX + key);
    }
    return {
        entries: metadata.entries.filter(function (e) { return !toRemove.includes(e.key); }),
        totalSize: metadata.totalSize - freedBytes,
    };
}
/**
 * Estimate size of a string in bytes (UTF-8)
 */
function byteLength(str) {
    var bytes = 0;
    for (var i = 0; i < str.length; i++) {
        var code = str.charCodeAt(i);
        if (code <= 0x7f)
            bytes += 1;
        else if (code <= 0x7ff)
            bytes += 2;
        else if (code >= 0xd800 && code <= 0xdbff) {
            // High surrogate — pair encodes a 4-byte UTF-8 code point
            bytes += 4;
            i++; // Skip low surrogate
        }
        else
            bytes += 3;
    }
    return bytes;
}
/**
 * TanStack Query persister compatible interface
 */
exports.mmkvPersister = {
    persistClient: function (client) {
        var data = JSON.stringify(client);
        var key = "client_state";
        var size = byteLength(data);
        var metadata = getMetadata();
        // Evict if needed
        if (metadata.totalSize + size > MAX_CACHE_SIZE_BYTES) {
            metadata = evictLRU(metadata, size);
        }
        exports.storage.set(CACHE_KEY_PREFIX + key, data);
        // Update metadata
        var existingIdx = metadata.entries.findIndex(function (e) { return e.key === key; });
        if (existingIdx >= 0) {
            metadata.totalSize -= metadata.entries[existingIdx].size;
            metadata.entries[existingIdx] = { key: key, size: size, accessedAt: Date.now() };
        }
        else {
            metadata.entries.push({ key: key, size: size, accessedAt: Date.now() });
        }
        metadata.totalSize += size;
        saveMetadata(metadata);
    },
    restoreClient: function () {
        var data = exports.storage.getString(CACHE_KEY_PREFIX + "client_state");
        if (!data)
            return undefined;
        // Update access time
        var metadata = getMetadata();
        var entry = metadata.entries.find(function (e) { return e.key === "client_state"; });
        if (entry) {
            entry.accessedAt = Date.now();
            saveMetadata(metadata);
        }
        try {
            return JSON.parse(data);
        }
        catch (_a) {
            return undefined;
        }
    },
    removeClient: function () {
        exports.storage.delete(CACHE_KEY_PREFIX + "client_state");
        var metadata = getMetadata();
        metadata.entries = metadata.entries.filter(function (e) { return e.key !== "client_state"; });
        saveMetadata(metadata);
    },
};
/**
 * Get current cache size in bytes
 */
function getCacheSize() {
    return getMetadata().totalSize;
}
/**
 * Clear entire cache
 */
function clearCache() {
    exports.storage.clearAll();
}
