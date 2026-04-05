/**
 * Mobile authentication module
 * Spec: 016-mobile-app (T009)
 *
 * Manages JWT tokens using expo-secure-store for secure persistence.
 * iOS: Keychain, Android: EncryptedSharedPreferences (via Keystore)
 */
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const TOKEN_EXPIRY_KEY = "auth_token_expiry";

export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * Store authentication tokens securely
 */
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, tokens.token),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
    SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, tokens.expiresAt),
  ]);
}

/**
 * Retrieve the current JWT access token
 */
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Retrieve the refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Check if the current token has expired
 */
export async function isTokenExpired(): Promise<boolean> {
  const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  // Consider expired 60 seconds before actual expiry to avoid race conditions
  const bufferMs = 60_000;
  return new Date(expiry).getTime() - bufferMs < Date.now();
}

/**
 * Check if user is authenticated (has a non-expired token)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const expired = await isTokenExpired();
  return !expired;
}

/**
 * Refresh the access token using the refresh token
 * Returns new tokens on success, null on failure
 */
export async function refreshToken(
  apiBaseUrl: string,
): Promise<AuthTokens | null> {
  const currentRefreshToken = await getRefreshToken();
  if (!currentRefreshToken) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/mobile-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grantType: "refresh_token",
        refreshToken: currentRefreshToken,
      }),
    });

    if (!response.ok) {
      // Refresh failed — clear tokens and require re-authentication
      await signOut();
      return null;
    }

    const tokens: AuthTokens = await response.json();
    await storeTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

/**
 * Sign in by exchanging a web session for mobile JWT tokens
 */
export async function signIn(
  apiBaseUrl: string,
  sessionCookie: string,
): Promise<AuthTokens | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/mobile-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ grantType: "session_exchange" }),
    });

    if (!response.ok) return null;

    const tokens: AuthTokens = await response.json();
    await storeTokens(tokens);
    return tokens;
  } catch {
    return null;
  }
}

/**
 * Sign out — remove all stored tokens
 */
export async function signOut(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
  ]);
}
