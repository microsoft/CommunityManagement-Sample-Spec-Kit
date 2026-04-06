/**
 * Teachers list screen — searchable with certification badges
 * Spec: 016-mobile-app (T031)
 */
import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../../lib/api-client";
import { TEACHERS_LIST_MESSAGES as MSG } from "../../../lib/messages";

interface TeacherListItem {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  certifications: string[];
  city: string | null;
}

interface TeachersResponse {
  teachers: TeacherListItem[];
}

export default function TeachersListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const params: Record<string, string> = {};
  if (search.trim()) params.q = search.trim();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["teachers", search],
    queryFn: async () => {
      const response = await get<TeachersResponse>("/api/teachers", params);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderTeacher = useCallback(
    ({ item }: { item: TeacherListItem }) => (
      <TouchableOpacity
        style={styles.teacherCard}
        onPress={() => router.push(`/(tabs)/teachers/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={item.displayName}
      >
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} accessibilityLabel={`${item.displayName} avatar`} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {item.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.teacherInfo}>
          <Text style={styles.teacherName}>{item.displayName}</Text>
          {item.city && <Text style={styles.teacherCity}>{item.city}</Text>}
          {item.certifications.length > 0 && (
            <View style={styles.certBadges}>
              {item.certifications.slice(0, 3).map((cert) => (
                <View key={cert} style={styles.certBadge}>
                  <Text style={styles.certText}>{cert}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [router],
  );

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
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder={MSG.search}
        value={search}
        onChangeText={setSearch}
        accessibilityLabel={MSG.search}
      />
      <FlatList
        data={data?.teachers ?? []}
        renderItem={renderTeacher}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{MSG.empty}</Text>
          </View>
        }
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchInput: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  listContent: { padding: 16, gap: 12 },
  teacherCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 22, fontWeight: "700", color: "#6b7280" },
  teacherInfo: { flex: 1, gap: 4 },
  teacherName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  teacherCity: { fontSize: 13, color: "#6b7280" },
  certBadges: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  certBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  certText: { fontSize: 11, fontWeight: "600", color: "#059669" },
  emptyState: { alignItems: "center", padding: 48 },
  emptyText: { fontSize: 16, color: "#6b7280" },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
  retryText: { fontSize: 14, color: "#2563eb" },
});
