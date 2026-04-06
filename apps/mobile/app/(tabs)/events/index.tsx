/**
 * Events list screen — searchable, filterable
 * Spec: 016-mobile-app (T026)
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
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../../lib/api-client";
import { EVENTS_LIST_MESSAGES as MSG } from "../../../lib/messages";

const CATEGORIES = ["All", "Workshop", "Jam", "Festival", "Retreat", "Class"] as const;

interface EventListItem {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  category: string;
  spotsLeft: number | null;
}

interface EventsResponse {
  events: EventListItem[];
}

export default function EventsListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [refreshing, setRefreshing] = useState(false);

  const params: Record<string, string> = {};
  if (search.trim()) params.q = search.trim();
  if (category !== "All") params.category = category.toLowerCase();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["events", "list", search, category],
    queryFn: async () => {
      const response = await get<EventsResponse>("/api/events", params);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderEvent = useCallback(
    ({ item }: { item: EventListItem }) => (
      <TouchableOpacity
        style={styles.eventRow}
        onPress={() => router.push(`/(tabs)/events/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.eventMeta}>
            {new Date(item.startsAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}{" "}
            · {item.location}
          </Text>
        </View>
        {item.spotsLeft !== null && item.spotsLeft <= 3 && (
          <Text style={styles.badge}>
            {item.spotsLeft === 0 ? "Full" : `${item.spotsLeft} left`}
          </Text>
        )}
      </TouchableOpacity>
    ),
    [router],
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder={MSG.search}
        value={search}
        onChangeText={setSearch}
        accessibilityLabel={MSG.search}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={styles.chipContainer}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
            accessibilityRole="button"
            accessibilityState={{ selected: category === cat }}
          >
            <Text
              style={[styles.chipText, category === cat && styles.chipTextActive]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : error ? (
        <TouchableOpacity style={styles.centered} onPress={() => refetch()}>
          <Text style={styles.errorText}>{MSG.error}</Text>
          <Text style={styles.retryText}>{MSG.retry}</Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={data?.events ?? []}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {search || category !== "All" ? MSG.emptyFiltered : MSG.empty}
              </Text>
            </View>
          }
          windowSize={5}
          maxToRenderPerBatch={10}
        />
      )}
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
  chipRow: { maxHeight: 48 },
  chipContainer: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
    minHeight: 36,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: "#2563eb" },
  chipText: { fontSize: 14, color: "#374151" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  listContent: { padding: 16, gap: 8 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  eventInfo: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  eventMeta: { fontSize: 13, color: "#6b7280" },
  badge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  emptyState: { alignItems: "center", padding: 48 },
  emptyText: { fontSize: 16, color: "#6b7280" },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
  retryText: { fontSize: 14, color: "#2563eb" },
});
