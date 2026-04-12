/**
 * Jest test setup for mobile app
 * Provides mocks for React Native modules not available in test environment
 */

// Pre-configure RNTL host component names to avoid auto-detection which can
// trigger React 19's strict act() error collection during module initialization.
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
const rntlConfig = require("@testing-library/react-native/build/config");
rntlConfig.configureInternal({
  hostComponentNames: {
    text: "Text",
    textInput: "TextInput",
    image: "Image",
    switch: "Switch",
    scrollView: "ScrollView",
    modal: "Modal",
  },
});
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
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
}));

// Mock expo-notifications
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: "ExponentPushToken[test]" }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5 },
  setNotificationChannelAsync: jest.fn(),
}));

// Mock @react-native-community/netinfo
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  useNetInfo: jest.fn().mockReturnValue({ isConnected: true, isInternetReachable: true }),
}));

// Mock react-native-mmkv
jest.mock("react-native-mmkv", () => {
  const store = new Map<string, string>();
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: jest.fn((key: string, value: string) => store.set(key, value)),
      getString: jest.fn((key: string) => store.get(key)),
      delete: jest.fn((key: string) => store.delete(key)),
      getAllKeys: jest.fn(() => [...store.keys()]),
      contains: jest.fn((key: string) => store.has(key)),
      clearAll: jest.fn(() => store.clear()),
    })),
  };
});

// Mock expo-router
jest.mock("expo-router", () => ({
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
}));

// Silence console.warn in tests for known RN warnings
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (msg.includes("Animated") || msg.includes("NativeModule")) return;
  originalWarn.apply(console, args);
};
