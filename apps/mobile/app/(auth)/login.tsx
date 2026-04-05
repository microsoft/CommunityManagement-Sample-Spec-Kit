/**
 * Login screen
 * Spec: 016-mobile-app (T015)
 */
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { signIn } from "../../lib/auth";
import { configureApiClient } from "../../lib/api-client";

const MSG = {
  title: "AcroYoga Community",
  subtitle: "Sign in to continue",
  emailLabel: "Email",
  emailPlaceholder: "your@email.com",
  passwordLabel: "Password",
  passwordPlaceholder: "Enter your password",
  signIn: "Sign In",
  signingIn: "Signing in...",
  error: "Sign in failed. Please check your credentials.",
} as const;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
      configureApiClient({ baseUrl: apiUrl });

      // Exchange credentials for session, then get mobile tokens
      const response = await fetch(`${apiUrl}/api/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!response.ok) {
        setError(MSG.error);
        return;
      }

      const sessionCookie = response.headers.get("set-cookie") ?? "";
      const tokens = await signIn(apiUrl, sessionCookie);

      if (tokens) {
        router.replace("/(tabs)");
      } else {
        setError(MSG.error);
      }
    } catch {
      setError(MSG.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{MSG.title}</Text>
        <Text style={styles.subtitle}>{MSG.subtitle}</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.form}>
          <Text style={styles.label}>{MSG.emailLabel}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={MSG.emailPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel={MSG.emailLabel}
          />

          <Text style={styles.label}>{MSG.passwordLabel}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={MSG.passwordPlaceholder}
            secureTextEntry
            autoComplete="password"
            accessibilityLabel={MSG.passwordLabel}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={loading ? MSG.signingIn : MSG.signIn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{MSG.signIn}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 32 },
  error: { color: "#dc2626", textAlign: "center", marginBottom: 16, fontSize: 14 },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
    minHeight: 48,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
