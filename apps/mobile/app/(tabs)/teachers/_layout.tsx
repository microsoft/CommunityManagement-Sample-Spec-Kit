/**
 * Teachers tab stack navigator
 * Spec: 016-mobile-app (T018)
 */
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function TeachersLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontWeight: "600" },
        ...(Platform.OS === "ios"
          ? { animation: "default" }
          : { animation: "fade_from_bottom" }),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Teachers" }} />
      <Stack.Screen name="[id]" options={{ title: "Teacher Profile" }} />
    </Stack>
  );
}
