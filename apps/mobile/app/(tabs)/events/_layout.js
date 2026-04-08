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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EventsLayout;
/**
 * Events tab stack navigator
 * Spec: 016-mobile-app (T017)
 */
var expo_router_1 = require("expo-router");
var react_native_1 = require("react-native");
function EventsLayout() {
    return (<expo_router_1.Stack screenOptions={__assign({ headerTitleStyle: { fontWeight: "600" } }, (react_native_1.Platform.OS === "ios"
            ? { animation: "default" }
            : { animation: "fade_from_bottom" }))}>
      <expo_router_1.Stack.Screen name="index" options={{ title: "Events" }}/>
      <expo_router_1.Stack.Screen name="[id]" options={{ title: "Event Details" }}/>
    </expo_router_1.Stack>);
}
