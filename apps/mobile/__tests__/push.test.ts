/**
 * Unit tests for push notifications module
 * Spec: 016-mobile-app (T042)
 */
import * as Notifications from "expo-notifications";
import { registerForPushNotifications } from "../lib/push";
import * as apiClient from "../lib/api-client";

jest.mock("../lib/api-client");
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("push notifications module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient.post.mockResolvedValue({
      data: { registered: true },
      error: null,
      status: 201,
    });
  });

  describe("registerForPushNotifications", () => {
    it("requests permission and registers token", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "granted",
      });

      const token = await registerForPushNotifications();
      expect(token).toBe("ExponentPushToken[test]");
      expect(mockApiClient.post).toHaveBeenCalledWith(
        "/api/notifications/devices",
        expect.objectContaining({
          expoPushToken: "ExponentPushToken[test]",
        }),
      );
    });

    it("requests permission when not already granted", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "undetermined",
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "granted",
      });

      const token = await registerForPushNotifications();
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(token).toBe("ExponentPushToken[test]");
    });

    it("returns null when permission denied", async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "denied",
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: "denied",
      });

      const token = await registerForPushNotifications();
      expect(token).toBeNull();
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });
});
