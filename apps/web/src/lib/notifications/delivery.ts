// Notification delivery adapters — Spec 015
//
// Responsible for delivering notifications to specific channels.
// In-app delivery inserts into the notifications table directly.
// Email delivery sends via Azure Communication Services.

import type { SendNotificationPayload, SendEmailPayload } from "@/lib/jobs/types";
import { NotificationChannel } from "@acroyoga/shared/types/notifications";
import { getEnabledChannels } from "@/lib/notifications/preferences";
import { getNotificationTemplate } from "@/lib/notifications/templates";
import { getUnsubscribeUrl } from "@/lib/notifications/unsubscribe";
import { renderNotificationEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/client";
import { db } from "@/lib/db/client";

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
    // Look up user's email address
    const userResult = await db().query<{ email: string }>(
      "SELECT email FROM users WHERE id = $1",
      [payload.userId],
    );
    if (userResult.rows.length > 0) {
      const template = getNotificationTemplate(payload.notificationType);
      const unsubscribeUrl = getUnsubscribeUrl(
        payload.userId,
        payload.notificationType,
        NotificationChannel.EMAIL,
      );

      const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
      const actionUrl = payload.resourceType && payload.resourceId
        ? `${baseUrl}/${payload.resourceType}s/${payload.resourceId}`
        : undefined;

      const html = renderNotificationEmail({
        subject: payload.title ?? template.title,
        title: payload.title ?? template.title,
        body: payload.body ?? template.body,
        actionUrl,
        unsubscribeUrl,
      });

      await sendEmail({
        to: userResult.rows[0].email,
        subject: payload.title ?? template.title,
        html,
      });
    }
  }
}

/**
 * Deliver an email directly (for send_email jobs).
 */
export async function deliverEmail(
  payload: SendEmailPayload,
): Promise<void> {
  await sendEmail({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}
