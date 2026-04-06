/**
 * Event detail screen with RSVP action
 * Spec: 016-mobile-app (T027, T028)
 */
import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../../../lib/api-client";
import { EVENT_DETAIL_MESSAGES as MSG } from "../../../lib/messages";

const ROLES = [
  { key: "base", label: "Base" },
  { key: "flyer", label: "Flyer" },
  { key: "hybrid", label: "Hybrid" },
] as const;

interface EventDetail {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  category: string;
  capacity: number | null;
  attendeeCount: number;
  spotsLeft: number | null;
  isRsvped: boolean;
  organizer: { id: string; displayName: string };
}

interface RsvpResponse {
  id: string;
  status: string;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRoleSheet, setShowRoleSheet] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const { data: event, isLoading, error, refetch } = useQuery({
    queryKey: ["events", id],
    queryFn: async () => {
      const response = await get<EventDetail>(`/api/events/${id}`);
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await post<RsvpResponse>("/api/rsvps", {
        eventId: id,
        role,
      });
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      const message =
        data?.status === "waitlisted" ? MSG.rsvpWaitlisted : MSG.rsvpSuccess;
      Alert.alert(message);
      setShowRoleSheet(false);
      setSelectedRole(null);
    },
    onError: () => {
      Alert.alert(MSG.rsvpError);
    },
  });

  function handleRsvpPress() {
    setShowRoleSheet(true);
  }

  function handleRoleConfirm() {
    if (selectedRole) {
      rsvpMutation.mutate(selectedRole);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>{MSG.loading}</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => refetch()}>
        <Text style={styles.errorText}>{MSG.error}</Text>
        <Text style={styles.retryText}>{MSG.retry}</Text>
      </TouchableOpacity>
    );
  }

  const isFull = event.spotsLeft !== null && event.spotsLeft <= 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.category}>{event.category}</Text>
        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{MSG.when}</Text>
            <Text style={styles.metaValue}>
              {new Date(event.startsAt).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{MSG.where}</Text>
            <Text style={styles.metaValue}>{event.location}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{MSG.attendees}</Text>
            <Text style={styles.metaValue}>
              {event.attendeeCount}
              {event.capacity ? ` / ${event.capacity}` : ""}
            </Text>
          </View>
        </View>

        {event.spotsLeft !== null && (
          <View style={[styles.spotsBadge, isFull && styles.spotsBadgeFull]}>
            <Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
              {isFull ? MSG.full : `${event.spotsLeft} ${MSG.spots}`}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>{MSG.about}</Text>
        <Text style={styles.description}>{event.description}</Text>
      </ScrollView>

      {!event.isRsvped && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.rsvpButton, isFull && styles.rsvpButtonWaitlist]}
            onPress={handleRsvpPress}
            accessibilityRole="button"
            accessibilityLabel={isFull ? MSG.rsvpFull : MSG.rsvp}
          >
            <Text style={styles.rsvpButtonText}>
              {isFull ? MSG.rsvpFull : MSG.rsvp}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showRoleSheet && (
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{MSG.selectRole}</Text>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.roleOption,
                  selectedRole === role.key && styles.roleOptionSelected,
                ]}
                onPress={() => setSelectedRole(role.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedRole === role.key }}
              >
                <Text
                  style={[
                    styles.roleText,
                    selectedRole === role.key && styles.roleTextSelected,
                  ]}
                >
                  {role.label}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowRoleSheet(false);
                  setSelectedRole(null);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>{MSG.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedRole && styles.confirmButtonDisabled,
                ]}
                onPress={handleRoleConfirm}
                disabled={!selectedRole || rsvpMutation.isPending}
                accessibilityRole="button"
              >
                {rsvpMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmText}>{MSG.confirm}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  category: { fontSize: 13, fontWeight: "600", color: "#2563eb", textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 16 },
  metaSection: { gap: 12, marginBottom: 16 },
  metaRow: { gap: 2 },
  metaLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", textTransform: "uppercase" },
  metaValue: { fontSize: 15, color: "#374151" },
  spotsBadge: { alignSelf: "flex-start", backgroundColor: "#ecfdf5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginBottom: 16 },
  spotsBadgeFull: { backgroundColor: "#fef2f2" },
  spotsText: { fontSize: 13, fontWeight: "600", color: "#059669" },
  spotsTextFull: { color: "#dc2626" },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 8 },
  description: { fontSize: 15, color: "#374151", lineHeight: 22 },
  loadingText: { fontSize: 14, color: "#6b7280", marginTop: 12 },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 8 },
  retryText: { fontSize: 14, color: "#2563eb" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  rsvpButton: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 16, alignItems: "center", minHeight: 52 },
  rsvpButtonWaitlist: { backgroundColor: "#7c3aed" },
  rsvpButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  sheetTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
  roleOption: { padding: 16, borderRadius: 10, borderWidth: 2, borderColor: "#e5e7eb", marginBottom: 10, minHeight: 52, justifyContent: "center" },
  roleOptionSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  roleText: { fontSize: 16, fontWeight: "500", color: "#374151" },
  roleTextSelected: { color: "#2563eb", fontWeight: "600" },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center", minHeight: 48 },
  cancelText: { fontSize: 16, color: "#374151", fontWeight: "500" },
  confirmButton: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: "#2563eb", alignItems: "center", minHeight: 48 },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmText: { fontSize: 16, color: "#fff", fontWeight: "600" },
});
