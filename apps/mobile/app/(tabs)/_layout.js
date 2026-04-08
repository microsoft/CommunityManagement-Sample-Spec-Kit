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
exports.default = TabLayout;
/**
 * Five-tab bottom navigation layout
 * Spec: 016-mobile-app (T016)
 *
 * Constitution V: UX consistency — consistent tab bar with platform-appropriate styling
 */
var expo_router_1 = require("expo-router");
var react_native_1 = require("react-native");
var vector_icons_1 = require("@expo/vector-icons");
var TAB_LABELS = {
    home: "Home",
    events: "Events",
    teachers: "Teachers",
    bookings: "Bookings",
    profile: "Profile",
};
function TabBarIcon(props) {
    return <vector_icons_1.Ionicons {...props} style={{ marginBottom: -3 }}/>;
}
function TabLayout() {
    return (<expo_router_1.Tabs screenOptions={{
            tabBarActiveTintColor: "#2563eb",
            tabBarInactiveTintColor: "#6b7280",
            tabBarLabelStyle: { fontSize: 12 },
            tabBarStyle: __assign({ borderTopWidth: 1, borderTopColor: "#e5e7eb" }, react_native_1.Platform.select({
                ios: { height: 88, paddingBottom: 28 },
                android: { height: 64, paddingBottom: 8 },
            })),
            headerTitleStyle: { fontWeight: "600" },
        }}>
      <expo_router_1.Tabs.Screen name="index" options={{
            title: TAB_LABELS.home,
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<TabBarIcon name="home-outline" color={color} size={size}/>);
            },
        }}/>
      <expo_router_1.Tabs.Screen name="events" options={{
            title: TAB_LABELS.events,
            headerShown: false,
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<TabBarIcon name="calendar-outline" color={color} size={size}/>);
            },
        }}/>
      <expo_router_1.Tabs.Screen name="teachers" options={{
            title: TAB_LABELS.teachers,
            headerShown: false,
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<TabBarIcon name="people-outline" color={color} size={size}/>);
            },
        }}/>
      <expo_router_1.Tabs.Screen name="bookings" options={{
            title: TAB_LABELS.bookings,
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<TabBarIcon name="bookmark-outline" color={color} size={size}/>);
            },
        }}/>
      <expo_router_1.Tabs.Screen name="profile" options={{
            title: TAB_LABELS.profile,
            headerShown: false,
            tabBarIcon: function (_a) {
                var color = _a.color, size = _a.size;
                return (<TabBarIcon name="person-outline" color={color} size={size}/>);
            },
        }}/>
    </expo_router_1.Tabs>);
}
