/**
 * Unit tests for connectivity module
 * Spec: 016-mobile-app (T037)
 */
import { checkConnectivity } from "../lib/connectivity";
import NetInfo from "@react-native-community/netinfo";

describe("connectivity module", () => {
  describe("checkConnectivity", () => {
    it("returns connected state", async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const state = await checkConnectivity();
      expect(state.isConnected).toBe(true);
      expect(state.isInternetReachable).toBe(true);
    });

    it("returns disconnected state", async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const state = await checkConnectivity();
      expect(state.isConnected).toBe(false);
      expect(state.isInternetReachable).toBe(false);
    });

    it("handles null isConnected gracefully", async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: null,
        isInternetReachable: null,
      });

      const state = await checkConnectivity();
      expect(state.isConnected).toBe(false);
      expect(state.isInternetReachable).toBeNull();
    });
  });
});
