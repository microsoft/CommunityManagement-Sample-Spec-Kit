"use client";

/**
 * LinkedAccountsList — profile settings: view and manage linked social accounts
 * Spec: 011-entra-external-id (T027)
 *
 * Constitution V: Accessible, mobile-first, design-token colours.
 * Constitution VIII: All strings from auth-messages.ts.
 * Constitution XI: Resource ownership — users can only manage their own accounts.
 */

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { formatEventDate } from "@acroyoga/shared/utils/format";
import { AUTH_MESSAGES } from "./auth-messages";
import type { LinkedAccount } from "@acroyoga/shared/types/auth";

interface LinkedAccountsListProps {
  /** The user's primary identity is in users.provider_oid. Pass true if set. */
  hasPrimaryIdentity: boolean;
}

export default function LinkedAccountsList({
  hasPrimaryIdentity,
}: LinkedAccountsListProps) {
  const locale = useLocale();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Total identity count: primary (users.provider_oid) + linked accounts
  const totalIdentities = accounts.length + (hasPrimaryIdentity ? 1 : 0);

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    try {
      const res = await fetch("/api/auth/link/list");
      if (!res.ok) throw new Error("Failed to load linked accounts");
      const data = await res.json();
      setAccounts(data.linkedAccounts ?? []);
    } catch {
      setError("Failed to load linked accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAccount() {
    // Step 1: Get a short-lived CSRF token
    const initRes = await fetch("/api/auth/link/init");
    if (!initRes.ok) {
      setError("Could not initiate account linking. Please try again.");
      return;
    }
    // The link token is stored server-side — client just triggers the OAuth flow
    // The actual linking happens in the NextAuth callback via POST /api/auth/link
    const { signIn } = await import("next-auth/react");
    await signIn("microsoft-entra-id", { callbackUrl: "/profile/accounts" });
  }

  async function handleRemove(accountId: string) {
    setRemoving(accountId);
    setError(null);

    try {
      const res = await fetch(`/api/auth/link/${accountId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to remove account.");
        return;
      }
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch {
      setError("Failed to remove account. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading linked accounts">
        {AUTH_MESSAGES.signInLoading}
      </div>
    );
  }

  return (
    <section aria-labelledby="linked-accounts-heading">
      <h2
        id="linked-accounts-heading"
        style={{
          fontSize: "16px",
          fontWeight: 600,
          marginBottom: "12px",
          color: "var(--color-foreground, #111827)",
        }}
      >
        {AUTH_MESSAGES.linkedAccountsTitle}
      </h2>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: "10px",
            borderRadius: "6px",
            backgroundColor: "var(--color-semantic-error-subtle, #fef2f2)",
            color: "var(--color-semantic-error, #dc2626)",
            fontSize: "14px",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      {/* Accounts list */}
      {accounts.length === 0 ? (
        <p
          style={{
            color: "var(--color-surface-muted-foreground, #4b5563)",
            fontSize: "14px",
          }}
        >
          {AUTH_MESSAGES.linkedAccountsEmpty}
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 16px 0",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {accounts.map((account) => {
            const isLastIdentity = totalIdentities <= 1;
            const isBeingRemoved = removing === account.id;

            return (
              <li
                key={account.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border, #e5e7eb)",
                  backgroundColor: "var(--color-surface, #ffffff)",
                }}
              >
                <div>
                  <span
                    style={{
                      fontWeight: 500,
                      textTransform: "capitalize",
                      color: "var(--color-foreground, #111827)",
                      fontSize: "14px",
                    }}
                  >
                    {account.provider}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "12px",
                      color: "var(--color-surface-muted-foreground, #4b5563)",
                    }}
                  >
                    {AUTH_MESSAGES.linkedAccountsLinkedAt}{" "}
                    {formatEventDate(account.linkedAt, locale, undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isLastIdentity || isBeingRemoved}
                  aria-label={`${AUTH_MESSAGES.linkedAccountsRemove} ${account.provider} account`}
                  title={
                    isLastIdentity
                      ? AUTH_MESSAGES.linkedAccountsLastIdentityTooltip
                      : undefined
                  }
                  onClick={() => handleRemove(account.id)}
                  style={{
                    minHeight: "44px",
                    minWidth: "44px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--color-border, #e5e7eb)",
                    backgroundColor: isLastIdentity
                      ? "var(--color-surface-muted, #f3f4f6)"
                      : "transparent",
                    color: isLastIdentity
                      ? "var(--color-surface-muted-foreground, #4b5563)"
                      : "var(--color-semantic-error, #dc2626)",
                    cursor: isLastIdentity ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {isBeingRemoved
                    ? AUTH_MESSAGES.linkedAccountsRemoving
                    : AUTH_MESSAGES.linkedAccountsRemove}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add account button */}
      <button
        type="button"
        onClick={handleAddAccount}
        aria-label={AUTH_MESSAGES.linkedAccountsAdd}
        style={{
          minHeight: "44px",
          padding: "10px 16px",
          borderRadius: "8px",
          border: "1px dashed var(--color-border, #e5e7eb)",
          backgroundColor: "transparent",
          color: "var(--color-foreground, #111827)",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "pointer",
          width: "100%",
        }}
      >
        + {AUTH_MESSAGES.linkedAccountsAdd}
      </button>
    </section>
  );
}
