/**
 * Profile screen — user info, social links, sign out
 * Spec: 016-mobile-app (T034)
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get } from "../../../lib/api-client";
import { signOut } from "../../../lib/auth";
import { PROFILE_MESSAGES as MSG } from "../../../lib/messages";

interface UserProfile {
  id: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  socialLinks: Array<{ platform: string; url: string }>;
  joinedAt: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await get<UserProfile>("/api/profile");
      if (response.error) throw new Error(response.error);
      return response.data;
    },
  });

  function handleSignOut() {
    Alert.alert(MSG.signOut, MSG.signOutConfirm, [
      { text: MSG.cancel, style: "cancel" },
      {
        text: MSG.signOut,
        style: "destructive",
        onPress: async () => {
          await signOut();
          queryClient.clear();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => refetch()}>
        <Text style={styles.errorText}>{MSG.error}</Text>
        <Text style={styles.retryText}>{MSG.retry}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} accessibilityLabel={`${profile.displayName} avatar`} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {profile.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{profile.displayName}</Text>
        {profile.email && <Text style={styles.email}>{profile.email}</Text>}
        <Text style={styles.memberSince}>
          {MSG.member} since{" "}
          {new Date(profile.joinedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
          })}
        </Text>
      </View>

      {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

      <View style={styles.menuSection}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/(tabs)/profile/settings/notifications")}
          accessibilityRole="button"
          accessibilityLabel={MSG.notificationSettings}
        >
          <Text style={styles.menuText}>{MSG.notificationSettings}</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel={MSG.signOut}
      >
        <Text style={styles.signOutText}>{MSG.signOut}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: {
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "700", color: "#4b5563" },
  name: { fontSize: 22, fontWeight: "700", color: "#111827" },
  email: { fontSize: 14, color: "#4b5563", marginTop: 4 },
  memberSince: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  bio: { fontSize: 15, color: "#374151", lineHeight: 22, marginBottom: 24 },
  menuSection: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 52,
  },
  menuText: { fontSize: 16, color: "#111827" },
  menuArrow: { fontSize: 20, color: "#9ca3af" },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 48,
  },
  signOutText: { fontSize: 16, color: "#dc2626", fontWeight: "600" },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
  retryText: { fontSize: 14, color: "#2563eb" },
});
