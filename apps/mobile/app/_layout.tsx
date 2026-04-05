/**
 * Root layout — auth gate, global providers, offline persistence
 * Spec: 016-mobile-app (T014, T040, T041)
 *
 * Constitution VI: Performance — MMKV-backed offline cache
 */
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StatusBar } from "expo-status-bar";
import { OfflineBanner } from "@acroyoga/shared-ui/OfflineBanner/index.native";
import { isAuthenticated } from "../lib/auth";
import { mmkvPersister } from "../lib/offline";
import { useOnlineStatus } from "../lib/connectivity";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
    },
  },
});

const persistOptions = {
  persister: mmkvPersister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isConnected } = useOnlineStatus();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const authed = await isAuthenticated();
      setIsLoggedIn(authed);
      setIsReady(true);
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isLoggedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isLoggedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isReady, isLoggedIn, segments, router]);

  if (!isReady) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <StatusBar style="auto" />
      <View style={{ flex: 1 }}>
        <OfflineBanner visible={!isConnected} />
        <Slot />
      </View>
    </PersistQueryClientProvider>
  );
}
