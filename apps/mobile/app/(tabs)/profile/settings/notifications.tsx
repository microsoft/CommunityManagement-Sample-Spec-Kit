/**
 * Notification settings screen — manage push notification preferences
 * Spec: 016-mobile-app (T035)
 *
 * Reuses preference types from Spec 015
 */
import { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "../../../../lib/api-client";

const MSG = {
  title: "Notification Settings",
  loading: "Loading preferences...",
  error: "Failed to load preferences",
  retry: "Tap to retry",
  saved: "Preferences saved",
  pushNotifications: "Push Notifications",
  pushDescription: "Receive push notifications on your device",
  categories: "Notification Categories",
  eventReminders: "Event Reminders",
  eventRemindersDesc: "Get reminded before events you've RSVP'd to",
  rsvpUpdates: "RSVP Updates",
  rsvpUpdatesDesc: "New RSVPs to your events",
  waitlistUpdates: "Waitlist Updates",
  waitlistUpdatesDesc: "When you're promoted from the waitlist",
  eventChanges: "Event Changes",
  eventChangesDesc: "Cancellations and schedule changes",
} as const;

interface NotificationPreferences {
  pushEnabled: boolean;
  categories: {
    eventReminders: boolean;
    rsvpUpdates: boolean;
    waitlistUpdates: boolean;
    eventChanges: boolean;
  };
}

export default function NotificationSettingsScreen() {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    pushEnabled: true,
    categories: {
      eventReminders: true,
      rsvpUpdates: true,
      waitlistUpdates: true,
      eventChanges: true,
    },
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const response = await get<NotificationPreferences>(
        "/api/notifications/preferences",
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
  });

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (newPrefs: NotificationPreferences) => {
      const response = await put("/api/notifications/preferences", newPrefs);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  function togglePush(value: boolean) {
    const updated = { ...prefs, pushEnabled: value };
    setPrefs(updated);
    saveMutation.mutate(updated);
  }

  function toggleCategory(
    key: keyof NotificationPreferences["categories"],
    value: boolean,
  ) {
    const updated = {
      ...prefs,
      categories: { ...prefs.categories, [key]: value },
    };
    setPrefs(updated);
    saveMutation.mutate(updated);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => refetch()}>
        <Text style={styles.errorText}>{MSG.error}</Text>
        <Text style={styles.retryText}>{MSG.retry}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>{MSG.pushNotifications}</Text>
            <Text style={styles.settingDesc}>{MSG.pushDescription}</Text>
          </View>
          <Switch
            value={prefs.pushEnabled}
            onValueChange={togglePush}
            trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
            thumbColor={prefs.pushEnabled ? "#2563eb" : "#f4f3f4"}
            accessibilityLabel={MSG.pushNotifications}
          />
        </View>
      </View>

      {prefs.pushEnabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{MSG.categories}</Text>

          {(
            [
              {
                key: "eventReminders" as const,
                title: MSG.eventReminders,
                desc: MSG.eventRemindersDesc,
              },
              {
                key: "rsvpUpdates" as const,
                title: MSG.rsvpUpdates,
                desc: MSG.rsvpUpdatesDesc,
              },
              {
                key: "waitlistUpdates" as const,
                title: MSG.waitlistUpdates,
                desc: MSG.waitlistUpdatesDesc,
              },
              {
                key: "eventChanges" as const,
                title: MSG.eventChanges,
                desc: MSG.eventChangesDesc,
              },
            ] as const
          ).map((item) => (
            <View key={item.key} style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={prefs.categories[item.key]}
                onValueChange={(v) => toggleCategory(item.key, v)}
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={prefs.categories[item.key] ? "#2563eb" : "#f4f3f4"}
                accessibilityLabel={item.title}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    minHeight: 60,
  },
  settingInfo: { flex: 1, marginRight: 16 },
  settingTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  settingDesc: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
  retryText: { fontSize: 14, color: "#2563eb" },
});
