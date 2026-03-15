/**
 * API Contract: Credits
 * Spec 001 — Creator-scoped credits for paid event cancellations
 *
 * Base path: /api/credits
 *
 * Credits are issued when a user cancels a paid RSVP within the refund window
 * and chooses "credit" over Stripe refund. Credits are:
 *   - Scoped to a specific creator (cannot be used cross-creator)
 *   - No expiry
 *   - Auto-applied at checkout (FIFO — oldest first)
 *   - Denominated in the original event's currency
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface Credit {
  id: string;
  userId: string;
  creatorId: string;
  creatorDisplayName: string;
  amount: number;
  currency: string;                // ISO 4217
  remainingBalance: number;
  issuedFromEventId: string;
  issuedFromEventTitle: string;
  createdAt: string;               // ISO 8601
}

export interface CreditBalance {
  creatorId: string;
  creatorDisplayName: string;
  currency: string;
  totalRemaining: number;          // sum of remaining_balance for this creator+currency
  credits: Credit[];               // individual credit records
}

// ─── GET /api/credits — Get credit balances ─────────────────────────

export interface ListCreditsQuery {
  /** Filter to credits for a specific creator. If omitted, returns all creators. */
  creatorId?: string;
}

export interface ListCreditsResponse {
  /** Grouped by creator+currency. Each entry is an aggregate with breakdown. */
  balances: CreditBalance[];
}

/**
 * Auth: Authenticated member (returns only the caller's credits).
 * Usage: Displayed on user's "My Credits" page and at checkout when booking
 *        an event by a creator for whom the user has credits.
 * Errors: 403 (not authenticated)
 */

// ─── Credit Application (internal — used by RSVP checkout) ──────────

/**
 * Not a public API endpoint. Used internally by the RSVP service during
 * paid event checkout.
 *
 * Algorithm:
 *  1. Query credits WHERE user_id = $userId AND creator_id = $creatorId
 *     AND currency = $currency AND remaining_balance > 0
 *     ORDER BY created_at ASC (FIFO)
 *  2. For each credit, consume min(remaining_balance, amountOwed)
 *  3. Reduce amountOwed by consumed amount
 *  4. If amountOwed > 0 after all credits → charge remainder via Stripe
 *  5. All within the same transaction as the RSVP INSERT
 */
export interface CreditApplication {
  creditsApplied: Array<{
    creditId: string;
    amountConsumed: number;
  }>;
  totalCreditsApplied: number;
  remainingCharge: number;         // amount to charge via Stripe (0 if fully covered)
}
