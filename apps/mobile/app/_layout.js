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
exports.default = RootLayout;
/**
 * Root layout — auth gate, global providers, offline persistence
 * Spec: 016-mobile-app (T014, T040, T041)
 *
 * Constitution VI: Performance — MMKV-backed offline cache
 */
var react_1 = require("react");
var react_native_1 = require("react-native");
var expo_router_1 = require("expo-router");
var react_query_1 = require("@tanstack/react-query");
var react_query_persist_client_1 = require("@tanstack/react-query-persist-client");
var expo_status_bar_1 = require("expo-status-bar");
var index_native_1 = require("@acroyoga/shared-ui/OfflineBanner/index.native");
var auth_1 = require("../lib/auth");
var offline_1 = require("../lib/offline");
var connectivity_1 = require("../lib/connectivity");
var queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes
            retry: 2,
        },
    },
});
var persistOptions = {
    persister: offline_1.mmkvPersister,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
};
function RootLayout() {
    var _a = (0, react_1.useState)(false), isReady = _a[0], setIsReady = _a[1];
    var _b = (0, react_1.useState)(false), isLoggedIn = _b[0], setIsLoggedIn = _b[1];
    var isConnected = (0, connectivity_1.useOnlineStatus)().isConnected;
    var segments = (0, expo_router_1.useSegments)();
    var router = (0, expo_router_1.useRouter)();
    (0, react_1.useEffect)(function () {
        function checkAuth() {
            return __awaiter(this, void 0, void 0, function () {
                var authed;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, (0, auth_1.isAuthenticated)()];
                        case 1:
                            authed = _a.sent();
                            setIsLoggedIn(authed);
                            setIsReady(true);
                            return [2 /*return*/];
                    }
                });
            });
        }
        checkAuth();
    }, []);
    (0, react_1.useEffect)(function () {
        if (!isReady)
            return;
        var inAuthGroup = segments[0] === "(auth)";
        if (!isLoggedIn && !inAuthGroup) {
            router.replace("/(auth)/login");
        }
        else if (isLoggedIn && inAuthGroup) {
            router.replace("/(tabs)");
        }
    }, [isReady, isLoggedIn, segments, router]);
    if (!isReady)
        return null;
    return (<react_query_persist_client_1.PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <expo_status_bar_1.StatusBar style="auto"/>
      <react_native_1.View style={{ flex: 1 }}>
        <index_native_1.OfflineBanner visible={!isConnected}/>
        <expo_router_1.Slot />
      </react_native_1.View>
    </react_query_persist_client_1.PersistQueryClientProvider>);
}
