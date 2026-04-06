/**
 * Unit tests for mobile API client
 * Spec: 016-mobile-app (T007)
 */
import { get, post, put, del, configureApiClient } from "../lib/api-client";
import * as auth from "../lib/auth";

// Mock the auth module
jest.mock("../lib/auth");

const mockAuth = auth as jest.Mocked<typeof auth>;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("api-client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureApiClient({ baseUrl: "http://test-api.com" });
    mockAuth.getToken.mockResolvedValue("test-token");
    mockAuth.signOut.mockResolvedValue(undefined);
  });

  describe("get", () => {
    it("sends GET request with auth header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ events: [] }),
      });

      const result = await get<{ events: unknown[] }>("/api/events");
      expect(result.data).toEqual({ events: [] });
      expect(result.error).toBeNull();
      expect(result.status).toBe(200);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/events",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("appends query params", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ events: [] }),
      });

      await get("/api/events", { category: "workshop" });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/events?category=workshop",
        expect.any(Object),
      );
    });

    it("returns error for non-ok responses", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const result = await get("/api/events/999");
      expect(result.data).toBeNull();
      expect(result.error).toBe("Not found");
      expect(result.status).toBe(404);
    });
  });

  describe("post", () => {
    it("sends POST request with JSON body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: "rsvp-1" }),
      });

      const result = await post("/api/rsvps", { eventId: "e1", role: "base" });
      expect(result.data).toEqual({ id: "rsvp-1" });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/api/rsvps",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ eventId: "e1", role: "base" }),
        }),
      );
    });
  });

  describe("put", () => {
    it("sends PUT request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
      });

      const result = await put("/api/profile", { name: "Updated" });
      expect(result.data).toEqual({ updated: true });
    });
  });

  describe("del", () => {
    it("sends DELETE request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ deleted: true }),
      });

      const result = await del("/api/rsvps/123");
      expect(result.data).toEqual({ deleted: true });
    });
  });

  describe("401 handling with token refresh", () => {
    it("retries request after successful token refresh", async () => {
      const newTokens = {
        token: "new-token",
        refreshToken: "new-refresh",
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };
      mockAuth.refreshToken.mockResolvedValue(newTokens);

      // First call: 401, second call: 200
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthorized" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

      const result = await get<{ data: string }>("/api/protected");
      expect(result.data).toEqual({ data: "success" });
      expect(mockAuth.refreshToken).toHaveBeenCalledWith(
        "http://test-api.com",
      );
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("signs out when refresh fails", async () => {
      mockAuth.refreshToken.mockResolvedValue(null);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      const result = await get("/api/protected");
      expect(result.status).toBe(401);
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it("does not retry when no token exists", async () => {
      mockAuth.getToken.mockResolvedValue(null);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      await get("/api/protected");
      expect(mockAuth.refreshToken).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
