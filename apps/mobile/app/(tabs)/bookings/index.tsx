/**
 * Bookings screen — user's RSVPs grouped by upcoming/past
 * Spec: 016-mobile-app (T033)
 */
import { useCallback, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../../lib/api-client";
import { BOOKINGS_MESSAGES as MSG } from "../../../lib/messages";

interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string;
  status: string;
  role: string;
}

interface BookingsResponse {
  bookings: Booking[];
}

export default function BookingsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const response = await get<BookingsResponse>("/api/bookings");
      if (response.error) throw new Error(response.error);
      return response.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const now = new Date();
  const upcoming = (data?.bookings ?? []).filter(
    (b) => new Date(b.eventStartsAt) >= now && b.status !== "cancelled",
  );
  const past = (data?.bookings ?? []).filter(
    (b) => new Date(b.eventStartsAt) < now || b.status === "cancelled",
  );

  const sections = [
    { title: MSG.upcoming, data: upcoming },
    { title: MSG.past, data: past },
  ].filter((s) => s.data.length > 0);

  function getStatusStyle(status: string) {
    switch (status) {
      case "confirmed":
        return { color: "#059669", label: MSG.confirmed };
      case "waitlisted":
        return { color: "#d97706", label: MSG.waitlisted };
      case "cancelled":
        return { color: "#dc2626", label: MSG.cancelled };
      default:
        return { color: "#4b5563", label: status };
    }
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

  if (sections.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>{MSG.empty}</Text>
        <Text style={styles.emptySubtext}>{MSG.emptySubtext}</Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      style={styles.container}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
      )}
      renderItem={({ item }) => {
        const statusInfo = getStatusStyle(item.status);
        return (
          <TouchableOpacity
            style={styles.bookingCard}
            onPress={() => router.push(`/(tabs)/events/${item.eventId}`)}
            accessibilityRole="button"
            accessibilityLabel={item.eventTitle}
          >
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingTitle} numberOfLines={1}>
                {item.eventTitle}
              </Text>
              <Text style={styles.bookingDate}>
                {new Date(item.eventStartsAt).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={styles.bookingLocation}>{item.eventLocation}</Text>
            </View>
            <View style={styles.bookingMeta}>
              <Text style={[styles.statusBadge, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
              <Text style={styles.roleBadge}>{item.role}</Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  listContent: { padding: 16 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  bookingCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  bookingInfo: { flex: 1, gap: 4 },
  bookingTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  bookingDate: { fontSize: 13, color: "#4b5563" },
  bookingLocation: { fontSize: 13, color: "#4b5563" },
  bookingMeta: { alignItems: "flex-end", gap: 6 },
  statusBadge: { fontSize: 12, fontWeight: "600" },
  roleBadge: {
    fontSize: 11,
    fontWeight: "500",
    color: "#2563eb",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "capitalize",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtext: { fontSize: 14, color: "#4b5563", textAlign: "center" },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
  retryText: { fontSize: 14, color: "#2563eb" },
});
