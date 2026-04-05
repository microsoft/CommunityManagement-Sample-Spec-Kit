/**
 * Profile tab stack navigator
 * Spec: 016-mobile-app (T019)
 */
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerTitleStyle: { fontWeight: "600" } }}>
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen
        name="settings/notifications"
        options={{ title: "Notification Settings" }}
      />
    </Stack>
  );
}
