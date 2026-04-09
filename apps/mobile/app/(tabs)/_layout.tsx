/**
 * Five-tab bottom navigation layout
 * Spec: 016-mobile-app (T016)
 *
 * Constitution V: UX consistency — consistent tab bar with platform-appropriate styling
 */
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const TAB_LABELS = {
  home: "Home",
  events: "Events",
  teachers: "Teachers",
  bookings: "Bookings",
  profile: "Profile",
} as const;

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function TabBarIcon(props: { name: IconName; color: string; size: number }) {
  return <Ionicons {...props} style={{ marginBottom: -3 }} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#4b5563",
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          ...Platform.select({
            ios: { height: 88, paddingBottom: 28 },
            android: { height: 64, paddingBottom: 8 },
          }),
        },
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: TAB_LABELS.home,
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: TAB_LABELS.events,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="teachers"
        options={{
          title: TAB_LABELS.teachers,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: TAB_LABELS.bookings,
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="bookmark-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: TAB_LABELS.profile,
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
