/**
 * Home tab — upcoming events feed
 * Spec: 016-mobile-app (T025)
 *
 * Constitution VI: Performance — FlatList with optimized rendering
 */
import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../lib/api-client";
import { HOME_MESSAGES as MSG } from "../../lib/messages";

interface EventListItem {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  category: string;
  spotsLeft: number | null;
  imageUrl: string | null;
}

interface EventsResponse {
  events: EventListItem[];
}

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["events", "upcoming"],
    queryFn: async () => {
      const response = await get<EventsResponse>("/api/events", {
        upcoming: "true",
        limit: "20",
      });
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
        style={styles.eventCard}
        onPress={() => router.push(`/(tabs)/events/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={styles.eventContent}>
          <Text style={styles.eventCategory}>{item.category}</Text>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.eventDate}>
            {new Date(item.startsAt).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.eventLocation} numberOfLines={1}>
            {item.location}
          </Text>
          {item.spotsLeft !== null && item.spotsLeft <= 5 && (
            <Text style={styles.spotsLeft}>
              {item.spotsLeft === 0 ? "Full" : `${item.spotsLeft} spots left`}
            </Text>
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
      <FlatList
        data={data?.events ?? []}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          data?.events?.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{MSG.empty}</Text>
            <Text style={styles.emptySubtext}>{MSG.emptySubtext}</Text>
          </View>
        }
        windowSize={5}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  eventContent: { padding: 16, gap: 4 },
  eventCategory: { fontSize: 12, fontWeight: "600", color: "#2563eb", textTransform: "uppercase" },
  eventTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  eventDate: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  eventLocation: { fontSize: 14, color: "#6b7280" },
  spotsLeft: { fontSize: 13, color: "#dc2626", fontWeight: "600", marginTop: 4 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#374151", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
  retryText: { fontSize: 14, color: "#2563eb" },
});
