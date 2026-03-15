"use client";

import { useEffect, useState } from "react";
import type { CreatorPaymentAccount } from "@/types/payments";

export default function CreatorSettingsPage() {
  const [account, setAccount] = useState<CreatorPaymentAccount | null>(null);
  const [connected, setConnected] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/payments/status");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setConnected(data.connected);
        setOnboardingComplete(data.onboardingComplete);
        setAccount(data.account);
      } catch {
        // Not connected or error
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/payments/connect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || "Failed to initiate connection");
        return;
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      alert("Network error");
    } finally {
      setConnecting(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Creator Settings</h1>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Payment Account</h2>

        {!connected ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Connect your Stripe account to receive payments for your events.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
            >
              {connecting ? "Redirecting…" : "Connect with Stripe"}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="h-3 w-3 rounded-full bg-green-500 inline-block" />
              <span className="text-sm font-medium text-green-700">Connected</span>
            </div>

            {account && (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Stripe Account</dt>
                  <dd className="font-mono">{account.stripeAccountId}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Connected Since</dt>
                  <dd>{new Date(account.connectedAt).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Onboarding</dt>
                  <dd>
                    {onboardingComplete ? (
                      <span className="text-green-600 font-medium">Complete</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">In Progress</span>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
