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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureApiClient = configureApiClient;
exports.getApiClientConfig = getApiClientConfig;
exports.get = get;
exports.post = post;
exports.put = put;
exports.del = del;
/**
 * Typed API client for mobile app
 * Spec: 016-mobile-app (T010)
 *
 * Provides authenticated HTTP methods with automatic JWT injection,
 * 401 interception with token refresh, and typed responses.
 */
var auth_1 = require("./auth");
var _config = {
    baseUrl: (_a = process.env.EXPO_PUBLIC_API_URL) !== null && _a !== void 0 ? _a : "http://localhost:3000",
};
/**
 * Configure the API client base URL
 */
function configureApiClient(config) {
    _config = __assign(__assign({}, _config), config);
}
/**
 * Get current API client config (useful for tests)
 */
function getApiClientConfig() {
    return __assign({}, _config);
}
/**
 * Internal fetch with JWT header injection and 401 retry
 */
function authenticatedFetch(path_1) {
    return __awaiter(this, arguments, void 0, function (path, options, retried) {
        var token, headers, url, response, refreshed;
        if (options === void 0) { options = {}; }
        if (retried === void 0) { retried = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, auth_1.getToken)()];
                case 1:
                    token = _a.sent();
                    headers = __assign({ "Content-Type": "application/json" }, options.headers);
                    if (token) {
                        headers.Authorization = "Bearer ".concat(token);
                    }
                    url = "".concat(_config.baseUrl).concat(path);
                    return [4 /*yield*/, fetch(url, __assign(__assign({}, options), { headers: headers }))];
                case 2:
                    response = _a.sent();
                    if (!(response.status === 401 && !retried && token)) return [3 /*break*/, 5];
                    return [4 /*yield*/, (0, auth_1.refreshToken)(_config.baseUrl)];
                case 3:
                    refreshed = _a.sent();
                    if (refreshed) {
                        return [2 /*return*/, authenticatedFetch(path, options, true)];
                    }
                    // Refresh failed — sign out
                    return [4 /*yield*/, (0, auth_1.signOut)()];
                case 4:
                    // Refresh failed — sign out
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/, response];
            }
        });
    });
}
/**
 * Parse response into ApiResponse shape
 */
function parseResponse(response) {
    return __awaiter(this, void 0, void 0, function () {
        var body, err_1, detail;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, response.json()];
                case 1:
                    body = _b.sent();
                    if (!response.ok) {
                        return [2 /*return*/, {
                                data: null,
                                error: (_a = body.error) !== null && _a !== void 0 ? _a : "Request failed with status ".concat(response.status),
                                status: response.status,
                            }];
                    }
                    return [2 /*return*/, { data: body, error: null, status: response.status }];
                case 2:
                    err_1 = _b.sent();
                    detail = err_1 instanceof Error ? err_1.message : "Unknown parse error";
                    return [2 /*return*/, {
                            data: null,
                            error: "Response parse error (status ".concat(response.status, "): ").concat(detail),
                            status: response.status,
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * HTTP GET with typed response
 */
function get(path, params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = params
                        ? "".concat(path, "?").concat(new URLSearchParams(params).toString())
                        : path;
                    return [4 /*yield*/, authenticatedFetch(url)];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, parseResponse(response)];
            }
        });
    });
}
/**
 * HTTP POST with typed request/response
 */
function post(path, body) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, authenticatedFetch(path, {
                        method: "POST",
                        body: body ? JSON.stringify(body) : undefined,
                    })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, parseResponse(response)];
            }
        });
    });
}
/**
 * HTTP PUT with typed request/response
 */
function put(path, body) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, authenticatedFetch(path, {
                        method: "PUT",
                        body: body ? JSON.stringify(body) : undefined,
                    })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, parseResponse(response)];
            }
        });
    });
}
/**
 * HTTP DELETE with typed response
 */
function del(path) {
    return __awaiter(this, void 0, void 0, function () {
        var response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, authenticatedFetch(path, { method: "DELETE" })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, parseResponse(response)];
            }
        });
    });
}
