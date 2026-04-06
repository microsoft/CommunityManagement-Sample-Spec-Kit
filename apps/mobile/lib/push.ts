/**
 * Push notifications module — registration, permissions, deep linking
 * Spec: 016-mobile-app (T044)
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { post } from "./api-client";

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushTokenRegistration {
  expoPushToken: string;
  platform: "ios" | "android";
}

/**
 * Request notification permissions and register device token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Register token with server — log failure but don't block the user
  const result = await post("/api/notifications/devices", {
    expoPushToken: token,
    platform: Platform.OS,
  });
  if (result.error) {
    console.warn("Failed to register push token with server:", result.error);
  }

  return token;
}

/**
 * Hook to handle push notification taps and deep linking
 */
export function usePushNotifications(): void {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        // Notification received in foreground — badge already handled by handler
      });

    // Listen for notification taps
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data, router);
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);
}

interface RouterLike {
  push: (path: string) => void;
}

/**
 * Navigate to the relevant screen based on notification data
 */
function handleNotificationNavigation(
  data: Record<string, unknown>,
  router: RouterLike,
): void {
  const type = data.type as string | undefined;
  const id = data.resourceId as string | undefined;

  if (!type || !id) return;

  switch (type) {
    case "event":
      router.push(`/(tabs)/events/${id}`);
      break;
    case "teacher":
      router.push(`/(tabs)/teachers/${id}`);
      break;
    case "booking":
      router.push("/(tabs)/bookings");
      break;
    default:
      break;
  }
}
