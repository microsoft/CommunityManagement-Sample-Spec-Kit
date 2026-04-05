/**
 * Haptic feedback utility — iOS-first with Android fallback
 * Spec: 016-mobile-app (T054)
 *
 * Constitution V: UX consistency — platform-appropriate tactile feedback
 */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Light haptic feedback for tab switches and selections
 */
export async function lightFeedback(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics not available on this device
  }
}

/**
 * Medium haptic feedback for confirmations (RSVP, etc.)
 */
export async function mediumFeedback(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Haptics not available on this device
  }
}

/**
 * Success haptic feedback
 */
export async function successFeedback(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Haptics not available on this device
  }
}

/**
 * Error haptic feedback
 */
export async function errorFeedback(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Haptics not available on this device
  }
}
