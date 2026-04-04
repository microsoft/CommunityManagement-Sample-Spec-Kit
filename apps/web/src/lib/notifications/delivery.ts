// Notification delivery adapters — Spec 015
//
// Responsible for delivering notifications to specific channels.
// In-app delivery inserts into the notifications table directly.
// Email delivery is stubbed here and implemented in Phase 5.

import type { SendNotificationPayload, SendEmailPayload } from "@/lib/jobs/types";
import { NotificationChannel } from "@acroyoga/shared/types/notifications";
import { getEnabledChannels } from "@/lib/notifications/preferences";

/**
 * Deliver a notification through its target channels.
 * Called by the job worker after a SEND_NOTIFICATION job is picked up.
 * Checks user preferences before delivering to each channel.
 */
export async function deliverNotification(
  payload: SendNotificationPayload,
): Promise<void> {
  const enabledChannels = await getEnabledChannels(
    payload.userId,
    payload.notificationType,
  );

  // In-app delivery is already handled by createNotification() in the service.
  // This handler exists for additional async channels (email, push).

  if (enabledChannels.includes(NotificationChannel.EMAIL)) {
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
