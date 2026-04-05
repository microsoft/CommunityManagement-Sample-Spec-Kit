/**
 * Unit tests for mobile auth module
 * Spec: 016-mobile-app (T006)
 */
import * as SecureStore from "expo-secure-store";
import {
  storeTokens,
  getToken,
  getRefreshToken,
  isTokenExpired,
  isAuthenticated,
  signOut,
} from "../lib/auth";

describe("auth module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("storeTokens", () => {
    it("stores token, refreshToken, and expiresAt in SecureStore", async () => {
      const tokens = {
        token: "test-jwt",
        refreshToken: "test-refresh",
        expiresAt: "2026-12-31T00:00:00.000Z",
      };
      await storeTokens(tokens);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "auth_token",
        "test-jwt",
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "auth_refresh_token",
        "test-refresh",
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "auth_token_expiry",
        "2026-12-31T00:00:00.000Z",
      );
    });
  });

  describe("getToken", () => {
    it("retrieves token from SecureStore", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("stored-jwt");
      const token = await getToken();
      expect(token).toBe("stored-jwt");
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("auth_token");
    });

    it("returns null when no token stored", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const token = await getToken();
      expect(token).toBeNull();
    });
  });

  describe("getRefreshToken", () => {
    it("retrieves refresh token from SecureStore", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        "stored-refresh",
      );
      const token = await getRefreshToken();
      expect(token).toBe("stored-refresh");
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
        "auth_refresh_token",
      );
    });
  });

  describe("isTokenExpired", () => {
    it("returns true when no expiry is stored", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      expect(await isTokenExpired()).toBe(true);
    });

    it("returns false when token is not yet expired", async () => {
      const future = new Date();
      future.setHours(future.getHours() + 2);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        future.toISOString(),
      );
      expect(await isTokenExpired()).toBe(false);
    });

    it("returns true when token is expired", async () => {
      const past = new Date();
      past.setHours(past.getHours() - 1);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        past.toISOString(),
      );
      expect(await isTokenExpired()).toBe(true);
    });

    it("considers token expired 60 seconds before actual expiry", async () => {
      const almostExpired = new Date();
      almostExpired.setSeconds(almostExpired.getSeconds() + 30); // 30s left (within 60s buffer)
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        almostExpired.toISOString(),
      );
      expect(await isTokenExpired()).toBe(true);
    });
  });

  describe("isAuthenticated", () => {
    it("returns false when no token exists", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      expect(await isAuthenticated()).toBe(false);
    });

    it("returns true when token exists and is not expired", async () => {
      const future = new Date();
      future.setHours(future.getHours() + 2);
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce("valid-jwt") // getToken -> TOKEN_KEY
        .mockResolvedValueOnce(future.toISOString()); // isTokenExpired -> TOKEN_EXPIRY_KEY
      expect(await isAuthenticated()).toBe(true);
    });

    it("returns false when token exists but is expired", async () => {
      const past = new Date();
      past.setHours(past.getHours() - 1);
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce("expired-jwt") // getToken
        .mockResolvedValueOnce(past.toISOString()); // isTokenExpired
      expect(await isAuthenticated()).toBe(false);
    });
  });

  describe("signOut", () => {
    it("removes all tokens from SecureStore", async () => {
      await signOut();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "auth_refresh_token",
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "auth_token_expiry",
      );
    });
  });
});
