"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for mobile API client
 * Spec: 016-mobile-app (T007)
 */
var api_client_1 = require("../lib/api-client");
var auth = require("../lib/auth");
// Mock the auth module
jest.mock("../lib/auth");
var mockAuth = auth;
// Mock global fetch
var mockFetch = jest.fn();
global.fetch = mockFetch;
describe("api-client", function () {
    beforeEach(function () {
        jest.clearAllMocks();
        (0, api_client_1.configureApiClient)({ baseUrl: "http://test-api.com" });
        mockAuth.getToken.mockResolvedValue("test-token");
        mockAuth.signOut.mockResolvedValue(undefined);
    });
    describe("get", function () {
        it("sends GET request with auth header", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockFetch.mockResolvedValue({
                            ok: true,
                            status: 200,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ events: [] })];
                            }); }); },
                        });
                        return [4 /*yield*/, (0, api_client_1.get)("/api/events")];
                    case 1:
                        result = _a.sent();
                        expect(result.data).toEqual({ events: [] });
                        expect(result.error).toBeNull();
                        expect(result.status).toBe(200);
                        expect(mockFetch).toHaveBeenCalledWith("http://test-api.com/api/events", expect.objectContaining({
                            headers: expect.objectContaining({
                                Authorization: "Bearer test-token",
                            }),
                        }));
                        return [2 /*return*/];
                }
            });
        }); });
        it("appends query params", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockFetch.mockResolvedValue({
                            ok: true,
                            status: 200,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ events: [] })];
                            }); }); },
                        });
                        return [4 /*yield*/, (0, api_client_1.get)("/api/events", { category: "workshop" })];
                    case 1:
                        _a.sent();
                        expect(mockFetch).toHaveBeenCalledWith("http://test-api.com/api/events?category=workshop", expect.any(Object));
                        return [2 /*return*/];
                }
            });
        }); });
        it("returns error for non-ok responses", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockFetch.mockResolvedValue({
                            ok: false,
                            status: 404,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ error: "Not found" })];
                            }); }); },
                        });
                        return [4 /*yield*/, (0, api_client_1.get)("/api/events/999")];
                    case 1:
                        result = _a.sent();
                        expect(result.data).toBeNull();
                        expect(result.error).toBe("Not found");
                        expect(result.status).toBe(404);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("post", function () {
        it("sends POST request with JSON body", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockFetch.mockResolvedValue({
                            ok: true,
                            status: 201,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ id: "rsvp-1" })];
                            }); }); },
                        });
                        return [4 /*yield*/, (0, api_client_1.post)("/api/rsvps", { eventId: "e1", role: "base" })];
                    case 1:
                        result = _a.sent();
                        expect(result.data).toEqual({ id: "rsvp-1" });
                        expect(mockFetch).toHaveBeenCalledWith("http://test-api.com/api/rsvps", expect.objectContaining({
                            method: "POST",
                            body: JSON.stringify({ eventId: "e1", role: "base" }),
                        }));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("put", function () {
        it("sends PUT request", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockFetch.mockResolvedValue({
                            ok: true,
                            status: 200,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ updated: true })];
                            }); }); },
                        });
                        return [4 /*yield*/, (0, api_client_1.put)("/api/profile", { name: "Updated" })];
                    case 1:
                        result = _a.sent();
                        expect(result.data).toEqual({ updated: true });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("del", function () {
        it("sends DELETE request", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockFetch.mockResolvedValue({
                            ok: true,
                            status: 200,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ deleted: true })];
                            }); }); },
                        });
                        return [4 /*yield*/, (0, api_client_1.del)("/api/rsvps/123")];
                    case 1:
                        result = _a.sent();
                        expect(result.data).toEqual({ deleted: true });
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("401 handling with token refresh", function () {
        it("retries request after successful token refresh", function () { return __awaiter(void 0, void 0, void 0, function () {
            var newTokens, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        newTokens = {
                            token: "new-token",
                            refreshToken: "new-refresh",
                            expiresAt: new Date(Date.now() + 86400000).toISOString(),
                        };
                        mockAuth.refreshToken.mockResolvedValue(newTokens);
                        // First call: 401, second call: 200
                        mockFetch
                            .mockResolvedValueOnce({
                            ok: false,
                            status: 401,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ error: "Unauthorized" })];
                            }); }); },
                        })
                            .mockResolvedValueOnce({
                            ok: true,
                            status: 200,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ data: "success" })];
                            }); }); },
                        });
                        return [4 /*yield*/, (0, api_client_1.get)("/api/protected")];
                    case 1:
                        result = _a.sent();
                        expect(result.data).toEqual({ data: "success" });
                        expect(mockAuth.refreshToken).toHaveBeenCalledWith("http://test-api.com");
                        expect(mockFetch).toHaveBeenCalledTimes(2);
                        return [2 /*return*/];
                }
            });
        }); });
        it("signs out when refresh fails", function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockAuth.refreshToken.mockResolvedValue(null);
                        mockFetch.mockResolvedValue({
                            ok: false,
                            status: 401,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ error: "Unauthorized" })];
                            }); }); },
                        });
                        return [4 /*yield*/, (0, api_client_1.get)("/api/protected")];
                    case 1:
                        result = _a.sent();
                        expect(result.status).toBe(401);
                        expect(mockAuth.signOut).toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        it("does not retry when no token exists", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockAuth.getToken.mockResolvedValue(null);
                        mockFetch.mockResolvedValue({
                            ok: false,
                            status: 401,
                            json: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ error: "Unauthorized" })];
                            }); }); },
                        });
                        return [4 /*yield*/, (0, api_client_1.get)("/api/protected")];
                    case 1:
                        _a.sent();
                        expect(mockAuth.refreshToken).not.toHaveBeenCalled();
                        expect(mockFetch).toHaveBeenCalledTimes(1);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
