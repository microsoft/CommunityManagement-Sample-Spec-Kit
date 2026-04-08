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
 * Unit tests for mobile auth module
 * Spec: 016-mobile-app (T006)
 */
var SecureStore = require("expo-secure-store");
var auth_1 = require("../lib/auth");
describe("auth module", function () {
    beforeEach(function () {
        jest.clearAllMocks();
    });
    describe("storeTokens", function () {
        it("stores token, refreshToken, and expiresAt in SecureStore", function () { return __awaiter(void 0, void 0, void 0, function () {
            var tokens;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokens = {
                            token: "test-jwt",
                            refreshToken: "test-refresh",
                            expiresAt: "2026-12-31T00:00:00.000Z",
                        };
                        return [4 /*yield*/, (0, auth_1.storeTokens)(tokens)];
                    case 1:
                        _a.sent();
                        expect(SecureStore.setItemAsync).toHaveBeenCalledWith("auth_token", "test-jwt");
                        expect(SecureStore.setItemAsync).toHaveBeenCalledWith("auth_refresh_token", "test-refresh");
                        expect(SecureStore.setItemAsync).toHaveBeenCalledWith("auth_token_expiry", "2026-12-31T00:00:00.000Z");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("getToken", function () {
        it("retrieves token from SecureStore", function () { return __awaiter(void 0, void 0, void 0, function () {
            var token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        SecureStore.getItemAsync.mockResolvedValue("stored-jwt");
                        return [4 /*yield*/, (0, auth_1.getToken)()];
                    case 1:
                        token = _a.sent();
                        expect(token).toBe("stored-jwt");
                        expect(SecureStore.getItemAsync).toHaveBeenCalledWith("auth_token");
                        return [2 /*return*/];
                }
            });
        }); });
        it("returns null when no token stored", function () { return __awaiter(void 0, void 0, void 0, function () {
            var token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        SecureStore.getItemAsync.mockResolvedValue(null);
                        return [4 /*yield*/, (0, auth_1.getToken)()];
                    case 1:
                        token = _a.sent();
                        expect(token).toBeNull();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("getRefreshToken", function () {
        it("retrieves refresh token from SecureStore", function () { return __awaiter(void 0, void 0, void 0, function () {
            var token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        SecureStore.getItemAsync.mockResolvedValue("stored-refresh");
                        return [4 /*yield*/, (0, auth_1.getRefreshToken)()];
                    case 1:
                        token = _a.sent();
                        expect(token).toBe("stored-refresh");
                        expect(SecureStore.getItemAsync).toHaveBeenCalledWith("auth_refresh_token");
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("isTokenExpired", function () {
        it("returns true when no expiry is stored", function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        SecureStore.getItemAsync.mockResolvedValue(null);
                        _a = expect;
                        return [4 /*yield*/, (0, auth_1.isTokenExpired)()];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        it("returns false when token is not yet expired", function () { return __awaiter(void 0, void 0, void 0, function () {
            var future, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        future = new Date();
                        future.setHours(future.getHours() + 2);
                        SecureStore.getItemAsync.mockResolvedValue(future.toISOString());
                        _a = expect;
                        return [4 /*yield*/, (0, auth_1.isTokenExpired)()];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        it("returns true when token is expired", function () { return __awaiter(void 0, void 0, void 0, function () {
            var past, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        past = new Date();
                        past.setHours(past.getHours() - 1);
                        SecureStore.getItemAsync.mockResolvedValue(past.toISOString());
                        _a = expect;
                        return [4 /*yield*/, (0, auth_1.isTokenExpired)()];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        it("considers token expired 60 seconds before actual expiry", function () { return __awaiter(void 0, void 0, void 0, function () {
            var almostExpired, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        almostExpired = new Date();
                        almostExpired.setSeconds(almostExpired.getSeconds() + 30); // 30s left (within 60s buffer)
                        SecureStore.getItemAsync.mockResolvedValue(almostExpired.toISOString());
                        _a = expect;
                        return [4 /*yield*/, (0, auth_1.isTokenExpired)()];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("isAuthenticated", function () {
        it("returns false when no token exists", function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        SecureStore.getItemAsync.mockResolvedValue(null);
                        _a = expect;
                        return [4 /*yield*/, (0, auth_1.isAuthenticated)()];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
        it("returns true when token exists and is not expired", function () { return __awaiter(void 0, void 0, void 0, function () {
            var future, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        future = new Date();
                        future.setHours(future.getHours() + 2);
                        SecureStore.getItemAsync
                            .mockResolvedValueOnce("valid-jwt") // getToken -> TOKEN_KEY
                            .mockResolvedValueOnce(future.toISOString()); // isTokenExpired -> TOKEN_EXPIRY_KEY
                        _a = expect;
                        return [4 /*yield*/, (0, auth_1.isAuthenticated)()];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        it("returns false when token exists but is expired", function () { return __awaiter(void 0, void 0, void 0, function () {
            var past, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        past = new Date();
                        past.setHours(past.getHours() - 1);
                        SecureStore.getItemAsync
                            .mockResolvedValueOnce("expired-jwt") // getToken
                            .mockResolvedValueOnce(past.toISOString()); // isTokenExpired
                        _a = expect;
                        return [4 /*yield*/, (0, auth_1.isAuthenticated)()];
                    case 1:
                        _a.apply(void 0, [_b.sent()]).toBe(false);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("signOut", function () {
        it("removes all tokens from SecureStore", function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, auth_1.signOut)()];
                    case 1:
                        _a.sent();
                        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token");
                        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_refresh_token");
                        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token_expiry");
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
