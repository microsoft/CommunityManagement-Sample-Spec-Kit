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
exports.storeTokens = storeTokens;
exports.getToken = getToken;
exports.getRefreshToken = getRefreshToken;
exports.isTokenExpired = isTokenExpired;
exports.isAuthenticated = isAuthenticated;
exports.refreshToken = refreshToken;
exports.signIn = signIn;
exports.signOut = signOut;
/**
 * Mobile authentication module
 * Spec: 016-mobile-app (T009)
 *
 * Manages JWT tokens using expo-secure-store for secure persistence.
 * iOS: Keychain, Android: EncryptedSharedPreferences (via Keystore)
 */
var SecureStore = require("expo-secure-store");
var TOKEN_KEY = "auth_token";
var REFRESH_TOKEN_KEY = "auth_refresh_token";
var TOKEN_EXPIRY_KEY = "auth_token_expiry";
/** Buffer before actual expiry to avoid race conditions during token refresh */
var TOKEN_EXPIRY_BUFFER_MS = 60000;
/**
 * Store authentication tokens securely
 */
function storeTokens(tokens) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        SecureStore.setItemAsync(TOKEN_KEY, tokens.token),
                        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
                        SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, tokens.expiresAt),
                    ])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Retrieve the current JWT access token
 */
function getToken() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, SecureStore.getItemAsync(TOKEN_KEY)];
        });
    });
}
/**
 * Retrieve the refresh token
 */
function getRefreshToken() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, SecureStore.getItemAsync(REFRESH_TOKEN_KEY)];
        });
    });
}
/**
 * Check if the current token has expired
 */
function isTokenExpired() {
    return __awaiter(this, void 0, void 0, function () {
        var expiry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, SecureStore.getItemAsync(TOKEN_EXPIRY_KEY)];
                case 1:
                    expiry = _a.sent();
                    if (!expiry)
                        return [2 /*return*/, true];
                    return [2 /*return*/, new Date(expiry).getTime() - TOKEN_EXPIRY_BUFFER_MS < Date.now()];
            }
        });
    });
}
/**
 * Check if user is authenticated (has a non-expired token)
 */
function isAuthenticated() {
    return __awaiter(this, void 0, void 0, function () {
        var token, expired;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getToken()];
                case 1:
                    token = _a.sent();
                    if (!token)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, isTokenExpired()];
                case 2:
                    expired = _a.sent();
                    return [2 /*return*/, !expired];
            }
        });
    });
}
/**
 * Refresh the access token using the refresh token
 * Returns new tokens on success, null on failure
 */
function refreshToken(apiBaseUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var currentRefreshToken, response, tokens, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getRefreshToken()];
                case 1:
                    currentRefreshToken = _b.sent();
                    if (!currentRefreshToken)
                        return [2 /*return*/, null];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 8, , 9]);
                    return [4 /*yield*/, fetch("".concat(apiBaseUrl, "/api/auth/mobile-token"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                grantType: "refresh_token",
                                refreshToken: currentRefreshToken,
                            }),
                        })];
                case 3:
                    response = _b.sent();
                    if (!!response.ok) return [3 /*break*/, 5];
                    // Refresh failed — clear tokens and require re-authentication
                    return [4 /*yield*/, signOut()];
                case 4:
                    // Refresh failed — clear tokens and require re-authentication
                    _b.sent();
                    return [2 /*return*/, null];
                case 5: return [4 /*yield*/, response.json()];
                case 6:
                    tokens = _b.sent();
                    return [4 /*yield*/, storeTokens(tokens)];
                case 7:
                    _b.sent();
                    return [2 /*return*/, tokens];
                case 8:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Sign in by exchanging a web session for mobile JWT tokens
 */
function signIn(apiBaseUrl, sessionCookie) {
    return __awaiter(this, void 0, void 0, function () {
        var response, tokens, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, fetch("".concat(apiBaseUrl, "/api/auth/mobile-token"), {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Cookie: sessionCookie,
                            },
                            body: JSON.stringify({ grantType: "session_exchange" }),
                        })];
                case 1:
                    response = _b.sent();
                    if (!response.ok)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, response.json()];
                case 2:
                    tokens = _b.sent();
                    return [4 /*yield*/, storeTokens(tokens)];
                case 3:
                    _b.sent();
                    return [2 /*return*/, tokens];
                case 4:
                    _a = _b.sent();
                    return [2 /*return*/, null];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Sign out — remove all stored tokens
 */
function signOut() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        SecureStore.deleteItemAsync(TOKEN_KEY),
                        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
                        SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
                    ])];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
