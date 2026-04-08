"use strict";
/**
 * Jest test setup for mobile app
 * Provides mocks for React Native modules not available in test environment
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
// Mock expo-secure-store
jest.mock("expo-secure-store", function () { return ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}); });
// Mock expo-haptics
jest.mock("expo-haptics", function () { return ({
    impactAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Light: "light",
        Medium: "medium",
        Heavy: "heavy",
    },
    notificationAsync: jest.fn(),
    NotificationFeedbackType: {
        Success: "success",
        Warning: "warning",
        Error: "error",
    },
}); });
// Mock expo-notifications
jest.mock("expo-notifications", function () { return ({
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
    getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "ExponentPushToken[test]" }),
    setNotificationHandler: jest.fn(),
    addNotificationReceivedListener: jest.fn(function () { return ({ remove: jest.fn() }); }),
    addNotificationResponseReceivedListener: jest.fn(function () { return ({ remove: jest.fn() }); }),
    AndroidImportance: { MAX: 5 },
    setNotificationChannelAsync: jest.fn(),
}); });
// Mock @react-native-community/netinfo
jest.mock("@react-native-community/netinfo", function () { return ({
    addEventListener: jest.fn(function () { return jest.fn(); }),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
    useNetInfo: jest.fn().mockReturnValue({ isConnected: true, isInternetReachable: true }),
}); });
// Mock react-native-mmkv
jest.mock("react-native-mmkv", function () {
    var store = new Map();
    return {
        MMKV: jest.fn().mockImplementation(function () { return ({
            set: jest.fn(function (key, value) { return store.set(key, value); }),
            getString: jest.fn(function (key) { return store.get(key); }),
            delete: jest.fn(function (key) { return store.delete(key); }),
            getAllKeys: jest.fn(function () { return __spreadArray([], store.keys(), true); }),
            contains: jest.fn(function (key) { return store.has(key); }),
            clearAll: jest.fn(function () { return store.clear(); }),
        }); }),
    };
});
// Mock expo-router
jest.mock("expo-router", function () { return ({
    useRouter: jest.fn().mockReturnValue({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        canGoBack: jest.fn().mockReturnValue(false),
    }),
    useLocalSearchParams: jest.fn().mockReturnValue({}),
    useSegments: jest.fn().mockReturnValue([]),
    useRootNavigation: jest.fn(),
    useRootNavigationState: jest.fn(),
    Link: "Link",
    Stack: {
        Screen: "Screen",
    },
    Tabs: {
        Screen: "Screen",
    },
    Redirect: "Redirect",
    Slot: "Slot",
}); });
// Silence console.warn in tests for known RN warnings
var originalWarn = console.warn;
console.warn = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("Animated") || msg.includes("NativeModule"))
        return;
    originalWarn.apply(console, args);
};
