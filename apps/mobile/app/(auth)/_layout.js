"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthLayout;
/**
 * Auth group layout
 * Spec: 016-mobile-app (T015)
 */
var expo_router_1 = require("expo-router");
function AuthLayout() {
    return (<expo_router_1.Stack screenOptions={{ headerShown: false }}/>);
}
