"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProfileLayout;
/**
 * Profile tab stack navigator
 * Spec: 016-mobile-app (T019)
 */
var expo_router_1 = require("expo-router");
function ProfileLayout() {
    return (<expo_router_1.Stack screenOptions={{ headerTitleStyle: { fontWeight: "600" } }}>
      <expo_router_1.Stack.Screen name="index" options={{ title: "Profile" }}/>
      <expo_router_1.Stack.Screen name="settings/notifications" options={{ title: "Notification Settings" }}/>
    </expo_router_1.Stack>);
}
