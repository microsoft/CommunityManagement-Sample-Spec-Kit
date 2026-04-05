/**
 * Teacher detail screen — profile, certifications, reviews
 * Spec: 016-mobile-app (T032)
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../../lib/api-client";

const MSG = {
  loading: "Loading teacher...",
  error: "Failed to load teacher",
  retry: "Tap to retry",
  certifications: "Certifications",
  about: "About",
  reviews: "Reviews",
  noReviews: "No reviews yet",
  noBio: "No bio available",
} as const;

interface TeacherDetail {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  certifications: Array<{ id: string; name: string; issuedAt: string }>;
  reviews: Array<{
    id: string;
    text: string;
    rating: number;
    authorName: string;
  }>;
  city: string | null;
  socialLinks: Array<{ platform: string; url: string }>;
}

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: teacher,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["teachers", id],
    queryFn: async () => {
      const response = await get<TeacherDetail>(`/api/teachers/${id}`);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !teacher) {
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
        {teacher.avatarUrl ? (
          <Image source={{ uri: teacher.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {teacher.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{teacher.displayName}</Text>
        {teacher.city && <Text style={styles.city}>{teacher.city}</Text>}
      </View>

      {teacher.certifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{MSG.certifications}</Text>
          <View style={styles.certList}>
            {teacher.certifications.map((cert) => (
              <View key={cert.id} style={styles.certBadge}>
                <Text style={styles.certName}>{cert.name}</Text>
                <Text style={styles.certDate}>
                  {new Date(cert.issuedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{MSG.about}</Text>
        <Text style={styles.bio}>{teacher.bio ?? MSG.noBio}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{MSG.reviews}</Text>
        {teacher.reviews.length === 0 ? (
          <Text style={styles.noReviews}>{MSG.noReviews}</Text>
        ) : (
          teacher.reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.authorName}</Text>
                <Text style={styles.reviewRating}>
                  {"★".repeat(review.rating)}
                </Text>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
            </View>
          ))
        )}
      </View>
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
  avatarInitial: { fontSize: 36, fontWeight: "700", color: "#6b7280" },
  name: { fontSize: 24, fontWeight: "700", color: "#111827" },
  city: { fontSize: 15, color: "#6b7280", marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  certList: { gap: 8 },
  certBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
  },
  certName: { fontSize: 14, fontWeight: "600", color: "#059669" },
  certDate: { fontSize: 13, color: "#6b7280" },
  bio: { fontSize: 15, color: "#374151", lineHeight: 22 },
  noReviews: { fontSize: 14, color: "#6b7280", fontStyle: "italic" },
  reviewCard: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  reviewAuthor: { fontSize: 14, fontWeight: "600", color: "#374151" },
  reviewRating: { color: "#f59e0b", fontSize: 14 },
  reviewText: { fontSize: 14, color: "#4b5563", lineHeight: 20 },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
  retryText: { fontSize: 14, color: "#2563eb" },
});
