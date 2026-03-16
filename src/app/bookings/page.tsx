"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Booking {
  id: string;
  ticket_type_name: string;
  group_name: string;
  pricing_tier: string;
  amount_paid: string;
  currency: string;
  credits_applied: string;
  payment_status: string;
  created_at: string;
}

export default function MyBookingsPage() {
  const { status: authStatus } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") return;
    fetch("/api/bookings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load bookings");
        return res.json();
      })
      .then((data) => setBookings(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [authStatus]);

  if (authStatus === "unauthenticated") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 text-lg">Please sign in to view your bookings.</p>
        <Link href="/api/auth/signin" className="text-indigo-600 hover:text-indigo-800 font-medium mt-4 inline-block">Sign In</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Bookings</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No bookings yet.</p>
          <Link href="/events" className="text-indigo-600 hover:text-indigo-800 font-medium mt-4 inline-block">Browse Events</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold text-gray-900">{b.group_name}</h2>
                  <p className="text-sm text-gray-600">{b.ticket_type_name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(b.created_at).toLocaleDateString()} &middot; {b.pricing_tier}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {b.currency} {b.amount_paid}
                  </p>
                  {parseFloat(b.credits_applied) > 0 && (
                    <p className="text-xs text-green-600">Credits: {b.credits_applied}</p>
                  )}
                  <span
                    className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${
                      b.payment_status === "completed"
                        ? "bg-green-100 text-green-800"
                        : b.payment_status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {b.payment_status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
