// Job queue type definitions — Spec 015

import type { NotificationType } from "@acroyoga/shared/types/notifications";

// ─── Job type enum ───────────────────────────────────────

export enum JobType {
  SEND_NOTIFICATION = "send_notification",
  SEND_EMAIL = "send_email",
}

// ─── Job payloads (discriminated union) ──────────────────

export interface SendNotificationPayload {
  type: JobType.SEND_NOTIFICATION;
  userId: string;
  notificationType: NotificationType;
  title: string;
  body?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface SendEmailPayload {
  type: JobType.SEND_EMAIL;
  to: string;
  subject: string;
  html: string;
  unsubscribeToken?: string;
}

export type JobPayload = SendNotificationPayload | SendEmailPayload;

// ─── Job status ──────────────────────────────────────────

export type JobStatus =
  | "created"
  | "active"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

// ─── Job metadata ────────────────────────────────────────

export interface JobMeta {
  id: string;
  type: JobType;
  status: JobStatus;
  createdAt: string;
  completedAt: string | null;
  retryCount: number;
}

// ─── Scheduled job names ─────────────────────────────────

export const SCHEDULED_JOBS = {
  REVIEW_REMINDER: "review-reminder",
  CERT_EXPIRY_CHECK: "cert-expiry-check",
  WAITLIST_CLEANUP: "waitlist-cleanup",
} as const;
