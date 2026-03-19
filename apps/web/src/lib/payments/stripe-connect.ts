import Stripe from "stripe";
import { db } from "@/lib/db/client";
import { STRIPE_API_VERSION } from "@/lib/payments/constants";
import type { CreatorPaymentAccount } from "@acroyoga/shared/types/payments";

interface PaymentRow {
  id: string;
  user_id: string;
  stripe_account_id: string;
  onboarding_complete: boolean;
  connected_at: string;
  disconnected_at: string | null;
}

function rowToAccount(row: PaymentRow): CreatorPaymentAccount {
  return {
    id: row.id,
    userId: row.user_id,
    stripeAccountId: row.stripe_account_id,
    onboardingComplete: row.onboarding_complete,
    connectedAt: new Date(row.connected_at).toISOString(),
    disconnectedAt: row.disconnected_at ? new Date(row.disconnected_at).toISOString() : null,
  };
}

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: STRIPE_API_VERSION });
}

/**
 * Generate Stripe Connect OAuth URL for a user.
 */
export function initiateConnect(userId: string): string {
  const clientId = process.env.STRIPE_CLIENT_ID!;
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/payments/callback`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: redirectUri,
    state: userId,
  });

  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/**
 * Handle the callback from Stripe OAuth: exchange code for account ID.
 */
export async function handleCallback(
  code: string,
  userId: string,
): Promise<CreatorPaymentAccount> {
  const stripe = getStripe();

  const response = await stripe.oauth.token({
    grant_type: "authorization_code",
    code,
  });

  const stripeAccountId = response.stripe_user_id!;

  const result = await db().query<PaymentRow>(
    `INSERT INTO creator_payment_accounts (user_id, stripe_account_id)
     VALUES ($1, $2) RETURNING *`,
    [userId, stripeAccountId],
  );

  return rowToAccount(result.rows[0]);
}

/**
 * Get payment/onboarding status for a user.
 */
export async function getPaymentStatus(
  userId: string,
): Promise<{ connected: boolean; onboardingComplete: boolean; account: CreatorPaymentAccount | null }> {
  const result = await db().query<PaymentRow>(
    "SELECT * FROM creator_payment_accounts WHERE user_id = $1",
    [userId],
  );

  if (result.rows.length === 0) {
    return { connected: false, onboardingComplete: false, account: null };
  }

  const account = rowToAccount(result.rows[0]);
  return {
    connected: true,
    onboardingComplete: account.onboardingComplete,
    account,
  };
}

/**
 * Update onboarding status from Stripe webhook.
 */
export async function updateOnboardingStatus(
  stripeAccountId: string,
  complete: boolean,
): Promise<void> {
  await db().query(
    "UPDATE creator_payment_accounts SET onboarding_complete = $1 WHERE stripe_account_id = $2",
    [complete, stripeAccountId],
  );
}
