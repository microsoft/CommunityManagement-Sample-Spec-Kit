/**
 * API Contract: Creator Payment Accounts
 * Spec 004 — Stripe Connect Standard onboarding for Event Creators
 *
 * Base path: /api/payments
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface CreatorPaymentAccount {
  id: string;
  userId: string;
  stripeAccountId: string;
  onboardingComplete: boolean;
  connectedAt: string;     // ISO 8601
  disconnectedAt: string | null;
}

// ─── POST /api/payments/connect — Initiate Stripe Connect OAuth ─────

export interface ConnectInitiateResponse {
  redirectUrl: string; // Stripe OAuth URL — redirect the user here
}

/** Errors: 403 (not an Event Creator), 409 (already connected) */

// ─── GET /api/payments/callback — Stripe OAuth callback ─────────────

/** Query parameters set by Stripe redirect:
 *  ?scope=read_write&code=ac_XXX
 *  or ?error=access_denied&error_description=...
 */

export interface ConnectCallbackSuccess {
  account: CreatorPaymentAccount;
}

export interface ConnectCallbackError {
  error: string;
  errorDescription: string;
}

/** Redirects user to /settings/creator with success or error query param */

// ─── GET /api/payments/status — Check onboarding status ─────────────

export interface PaymentStatusResponse {
  connected: boolean;
  onboardingComplete: boolean;
  account: CreatorPaymentAccount | null;
}

/** Errors: 403 (not authenticated) */
