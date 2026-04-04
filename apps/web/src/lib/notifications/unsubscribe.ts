// Unsubscribe token utilities — Spec 015
//
// Creates and verifies signed tokens for one-click email unsubscribe.
// Tokens are signed with HMAC-SHA256 using the application secret.

import { createHmac, timingSafeEqual } from "crypto";
import type { NotificationType, NotificationChannel } from "@acroyoga/shared/types/notifications";

export interface UnsubscribeTokenPayload {
  userId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  exp: number;
}

const TOKEN_EXPIRY_DAYS = 30;

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "dev-secret-for-testing";
}

/**
 * Create a signed unsubscribe token.
 */
export function createUnsubscribeToken(
  userId: string,
  notificationType: NotificationType,
  channel: NotificationChannel,
): string {
  const payload: UnsubscribeTokenPayload = {
    userId,
    notificationType,
    channel,
    exp: Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };

  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString("base64url");
  const signature = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

/**
 * Verify and decode an unsubscribe token.
 * Returns null if the token is invalid, expired, or tampered with.
 */
export function verifyUnsubscribeToken(
  token: string,
): UnsubscribeTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;

  // Verify signature
  const expectedSignature = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");

  try {
    const sigBuffer = Buffer.from(signature, "base64url");
    const expectedBuffer = Buffer.from(expectedSignature, "base64url");
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;
  } catch {
    return null;
  }

  // Decode payload
  try {
    const data = Buffer.from(encoded, "base64url").toString("utf-8");
    const payload: UnsubscribeTokenPayload = JSON.parse(data);

    // Check expiry
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate the unsubscribe URL for a notification email.
 */
export function getUnsubscribeUrl(
  userId: string,
  notificationType: NotificationType,
  channel: NotificationChannel,
): string {
  const token = createUnsubscribeToken(userId, notificationType, channel);
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return `${baseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}
