import { db } from "@/lib/db/client";
import type { CreditBalance } from "@/types/credits";

export async function getCreditBalance(userId: string, creatorId: string): Promise<CreditBalance> {
  const result = await db().query<{ total: string; currency: string }>(
    `SELECT SUM(remaining_balance) as total, currency
     FROM credits
     WHERE user_id = $1 AND creator_id = $2 AND remaining_balance > 0
     GROUP BY currency`,
    [userId, creatorId],
  );

  if (result.rows.length === 0) {
    return { userId, creatorId, balance: 0, currency: "GBP" };
  }

  return {
    userId,
    creatorId,
    balance: parseFloat(result.rows[0].total),
    currency: result.rows[0].currency,
  };
}

/**
 * Apply credits toward a purchase. Returns the amount still owed.
 * Deducts from oldest credits first (FIFO).
 */
export async function applyCredits(
  userId: string,
  creatorId: string,
  amount: number,
  currency: string,
): Promise<{ applied: number; remaining: number }> {
  // Get available credits, oldest first
  const creditsResult = await db().query<{ id: string; remaining_balance: string }>(
    `SELECT id, remaining_balance FROM credits
     WHERE user_id = $1 AND creator_id = $2 AND currency = $3 AND remaining_balance > 0
     ORDER BY created_at ASC`,
    [userId, creatorId, currency],
  );

  let totalApplied = 0;
  let amountLeft = amount;

  for (const credit of creditsResult.rows) {
    if (amountLeft <= 0) break;
    const available = parseFloat(credit.remaining_balance);
    const deduction = Math.min(available, amountLeft);

    await db().query(
      "UPDATE credits SET remaining_balance = remaining_balance - $1 WHERE id = $2",
      [deduction, credit.id],
    );

    totalApplied += deduction;
    amountLeft -= deduction;
  }

  return { applied: totalApplied, remaining: Math.max(0, amountLeft) };
}
