/**
 * Connectivity monitoring module
 * Spec: 016-mobile-app (T039)
 */
import { useState, useEffect } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

/**
 * Hook to monitor online/offline state
 */
export function useOnlineStatus(): ConnectivityState {
  const [state, setState] = useState<ConnectivityState>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      setState({
        isConnected: netState.isConnected ?? false,
        isInternetReachable: netState.isInternetReachable ?? null,
      });
    });

    // Initial check
    NetInfo.fetch().then((netState: NetInfoState) => {
      setState({
        isConnected: netState.isConnected ?? false,
        isInternetReachable: netState.isInternetReachable ?? null,
      });
    });

    return () => unsubscribe();
  }, []);

  return state;
}

/**
 * Check connectivity once (non-hook, for use outside components)
 */
export async function checkConnectivity(): Promise<ConnectivityState> {
  const netState = await NetInfo.fetch();
  return {
    isConnected: netState.isConnected ?? false,
    isInternetReachable: netState.isInternetReachable ?? null,
  };
}
