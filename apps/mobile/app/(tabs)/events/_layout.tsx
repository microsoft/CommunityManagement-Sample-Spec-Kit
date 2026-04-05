/**
 * Events tab stack navigator
 * Spec: 016-mobile-app (T017)
 */
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function EventsLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: "600" },
        ...(Platform.OS === "ios"
          ? { animation: "default" }
          : { animation: "fade_from_bottom" }),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Events" }} />
      <Stack.Screen name="[id]" options={{ title: "Event Details" }} />
    </Stack>
  );
}
