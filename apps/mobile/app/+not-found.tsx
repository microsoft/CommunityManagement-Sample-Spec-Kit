/**
 * Not found screen
 * Spec: 016-mobile-app (T020)
 */
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

const MSG = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist.",
  goHome: "Go to Home",
} as const;

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{MSG.title}</Text>
      <Text style={styles.description}>{MSG.description}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/(tabs)")}
        accessibilityRole="button"
        accessibilityLabel={MSG.goHome}
      >
        <Text style={styles.buttonText}>{MSG.goHome}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  description: { fontSize: 16, color: "#666", marginBottom: 24, textAlign: "center" },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
