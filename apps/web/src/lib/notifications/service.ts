// Notification service — Spec 015
//
// Core notification operations: create, list, mark as read, count unread, delete.
// All mutations go through the database via db().query() — Constitution I (API-First).

import { db } from "@/lib/db/client";
import type {
  Notification,
  NotificationType,
  NotificationResourceType,
} from "@acroyoga/shared/types/notifications";
import { JobType, type SendNotificationPayload } from "@/lib/jobs/types";
import { enqueueJob } from "@/lib/jobs/queue";
import { getNotificationTemplate, getResourceTypeForNotification } from "./templates";

// ─── Row type ────────────────────────────────────────────

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  resource_type: string | null;
  resource_id: string | null;
  read: boolean;
  created_at: string;
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    resourceType: row.resource_type as NotificationResourceType | null,
    resourceId: row.resource_id,
    read: row.read,
    createdAt: row.created_at,
  };
}

// ─── Service functions ───────────────────────────────────

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title?: string;
  body?: string;
  resourceType?: NotificationResourceType;
  resourceId?: string;
}

/**
 * Create an in-app notification and enqueue async delivery job.
 * The notification is immediately visible in the bell icon.
 * The delivery job handles additional channels (email, push).
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const template = getNotificationTemplate(input.type);
  const title = input.title ?? template.title;
  const body = input.body ?? template.body;
  const resourceType = input.resourceType ?? getResourceTypeForNotification(input.type);

  const result = await db().query<NotificationRow>(
    `INSERT INTO notifications (user_id, type, title, body, resource_type, resource_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, type, title, body, resource_type, resource_id, read, created_at`,
    [input.userId, input.type, title, body, resourceType ?? null, input.resourceId ?? null],
  );

  const notification = rowToNotification(result.rows[0]);

  // Enqueue async delivery job for additional channels
  const jobPayload: SendNotificationPayload = {
    type: JobType.SEND_NOTIFICATION,
    userId: input.userId,
    notificationType: input.type,
    title,
    body,
    resourceType: resourceType ?? undefined,
    resourceId: input.resourceId,
  };

  await enqueueJob(JobType.SEND_NOTIFICATION, jobPayload, {
    deduplicationKey: `notif-${notification.id}`,
  });

  return notification;
}

/**
 * Get paginated notifications for a user, sorted by created_at DESC.
 */
export async function getNotificationsForUser(
  userId: string,
  options?: { page?: number; pageSize?: number },
): Promise<{ notifications: Notification[]; total: number }> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const countResult = await db().query<{ count: string }>(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1",
    [userId],
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await db().query<NotificationRow>(
    `SELECT id, user_id, type, title, body, resource_type, resource_id, read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset],
  );

  return {
    notifications: result.rows.map(rowToNotification),
    total,
  };
}

/**
 * Mark a notification as read. Returns true if the notification was found and updated.
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  // Check existence & ownership first (PGlite rowCount unreliable)
  const existing = await db().query<{ id: string }>(
    "SELECT id FROM notifications WHERE id = $1 AND user_id = $2",
    [notificationId, userId],
  );
  if (existing.rows.length === 0) return false;

  await db().query(
    "UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2",
    [notificationId, userId],
  );
  return true;
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<number> {
  // Count unread first (PGlite rowCount unreliable)
  const countResult = await db().query<{ count: string }>(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false",
    [userId],
  );
  const count = parseInt(countResult.rows[0].count);

  await db().query(
    "UPDATE notifications SET read = true WHERE user_id = $1 AND read = false",
    [userId],
  );
  return count;
}

/**
 * Get the count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await db().query<{ count: string }>(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false",
    [userId],
  );
  return parseInt(result.rows[0].count);
}

/**
 * Delete all notifications for a user (GDPR deletion).
 */
export async function deleteNotificationsForUser(userId: string): Promise<void> {
  await db().query("DELETE FROM notifications WHERE user_id = $1", [userId]);
}
