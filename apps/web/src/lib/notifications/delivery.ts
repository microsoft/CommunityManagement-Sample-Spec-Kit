// Notification delivery adapters — Spec 015
//
// Responsible for delivering notifications to specific channels.
// In-app delivery inserts into the notifications table directly.
// Email delivery is stubbed here and implemented in Phase 5.

import type { SendNotificationPayload, SendEmailPayload } from "@/lib/jobs/types";
import type { NotificationChannel } from "@acroyoga/shared/types/notifications";

/**
 * Deliver a notification through its target channels.
 * Called by the job worker after a SEND_NOTIFICATION job is picked up.
 */
export async function deliverNotification(
  payload: SendNotificationPayload,
): Promise<void> {
  // Check user preferences before delivering
  let enabledChannels: NotificationChannel[];
  try {
    const { getEnabledChannels } = await import("@/lib/notifications/preferences");
    enabledChannels = await getEnabledChannels(payload.userId, payload.notificationType);
  } catch {
    // If preferences module isn't available yet, deliver to all channels
    enabledChannels = ["in_app" as NotificationChannel];
  }

  // In-app delivery is already handled by createNotification() in the service.
  // This handler exists for additional async channels (email, push).

  if (enabledChannels.includes("email" as NotificationChannel)) {
    // Email delivery — implemented in Phase 5
    // For now, this is a no-op stub
  }
}

/**
 * Deliver an email via Azure Communication Services.
 * Stub for Phase 5 — will be implemented in T032.
 */
export async function deliverEmail(
  _payload: SendEmailPayload,
): Promise<void> {
  // Phase 5: Azure Communication Services email delivery
  // For now, this is a no-op stub
}
