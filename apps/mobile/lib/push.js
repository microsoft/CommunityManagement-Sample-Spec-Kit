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
exports.registerForPushNotifications = registerForPushNotifications;
exports.usePushNotifications = usePushNotifications;
/**
 * Push notifications module — registration, permissions, deep linking
 * Spec: 016-mobile-app (T044)
 */
var react_1 = require("react");
var react_native_1 = require("react-native");
var Notifications = require("expo-notifications");
var expo_router_1 = require("expo-router");
var api_client_1 = require("./api-client");
// Configure foreground notification behavior
Notifications.setNotificationHandler({
    handleNotification: function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                })];
        });
    }); },
});
/**
 * Request notification permissions and register device token
 */
function registerForPushNotifications() {
    return __awaiter(this, void 0, void 0, function () {
        var existingStatus, finalStatus, status_1, tokenData, token, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Notifications.getPermissionsAsync()];
                case 1:
                    existingStatus = (_a.sent()).status;
                    finalStatus = existingStatus;
                    if (!(existingStatus !== "granted")) return [3 /*break*/, 3];
                    return [4 /*yield*/, Notifications.requestPermissionsAsync()];
                case 2:
                    status_1 = (_a.sent()).status;
                    finalStatus = status_1;
                    _a.label = 3;
                case 3:
                    if (finalStatus !== "granted") {
                        return [2 /*return*/, null];
                    }
                    if (!(react_native_1.Platform.OS === "android")) return [3 /*break*/, 5];
                    return [4 /*yield*/, Notifications.setNotificationChannelAsync("default", {
                            name: "Default",
                            importance: Notifications.AndroidImportance.MAX,
                        })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [4 /*yield*/, Notifications.getExpoPushTokenAsync()];
                case 6:
                    tokenData = _a.sent();
                    token = tokenData.data;
                    return [4 /*yield*/, (0, api_client_1.post)("/api/notifications/devices", {
                            expoPushToken: token,
                            platform: react_native_1.Platform.OS,
                        })];
                case 7:
                    result = _a.sent();
                    if (result.error) {
                        console.warn("Failed to register push token with server:", result.error);
                    }
                    return [2 /*return*/, token];
            }
        });
    });
}
/**
 * Hook to handle push notification taps and deep linking
 */
function usePushNotifications() {
    var router = (0, expo_router_1.useRouter)();
    var notificationListener = (0, react_1.useRef)();
    var responseListener = (0, react_1.useRef)();
    (0, react_1.useEffect)(function () {
        // Listen for notifications received while app is foregrounded
        notificationListener.current =
            Notifications.addNotificationReceivedListener(function () {
                // Notification received in foreground — badge already handled by handler
            });
        // Listen for notification taps
        responseListener.current =
            Notifications.addNotificationResponseReceivedListener(function (response) {
                var data = response.notification.request.content.data;
                handleNotificationNavigation(data, router);
            });
        return function () {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [router]);
}
/**
 * Navigate to the relevant screen based on notification data
 */
function handleNotificationNavigation(data, router) {
    var type = data.type;
    var id = data.resourceId;
    if (!type || !id)
        return;
    switch (type) {
        case "event":
            router.push("/(tabs)/events/".concat(id));
            break;
        case "teacher":
            router.push("/(tabs)/teachers/".concat(id));
            break;
        case "booking":
            router.push("/(tabs)/bookings");
            break;
        default:
            break;
    }
}
