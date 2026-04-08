"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var offline_1 = require("../lib/offline");
/** Helper to create a valid PersistedClient shape for testing */
function mockClient(data) {
    return {
        timestamp: Date.now(),
        buster: "",
        clientState: __assign({ queries: [], mutations: [] }, data),
    };
}
describe("offline module", function () {
    beforeEach(function () {
        offline_1.storage.clearAll();
    });
    describe("mmkvPersister", function () {
        it("persists and restores client state", function () {
            var client = mockClient({
                queries: [{ queryKey: ["events"], state: { data: { events: [] } } }],
            });
            offline_1.mmkvPersister.persistClient(client);
            var restored = offline_1.mmkvPersister.restoreClient();
            expect(restored).toEqual(client);
        });
        it("returns undefined when no state persisted", function () {
            var restored = offline_1.mmkvPersister.restoreClient();
            expect(restored).toBeUndefined();
        });
        it("removes client state", function () {
            offline_1.mmkvPersister.persistClient(mockClient({ version: 1 }));
            offline_1.mmkvPersister.removeClient();
            expect(offline_1.mmkvPersister.restoreClient()).toBeUndefined();
        });
        it("overwrites existing state", function () {
            var v1 = mockClient({ version: 1 });
            var v2 = mockClient({ version: 2 });
            offline_1.mmkvPersister.persistClient(v1);
            offline_1.mmkvPersister.persistClient(v2);
            var restored = offline_1.mmkvPersister.restoreClient();
            expect(restored).toEqual(v2);
        });
    });
    describe("clearCache", function () {
        it("removes all cached data", function () {
            offline_1.mmkvPersister.persistClient(mockClient({ data: "test" }));
            (0, offline_1.clearCache)();
            expect(offline_1.mmkvPersister.restoreClient()).toBeUndefined();
        });
    });
});
