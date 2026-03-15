"use client";

import { useEffect, useState } from "react";

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        setBookings(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6">Loading bookings...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      {bookings.length === 0 ? (
        <p className="text-gray-500">No bookings yet.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-semibold">{b.group_name}</h2>
                  <p className="text-sm text-gray-600">{b.ticket_type_name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(b.created_at).toLocaleDateString()} &middot;{" "}
                    {b.pricing_tier}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {b.currency} {b.amount_paid}
                  </p>
                  {parseFloat(b.credits_applied) > 0 && (
                    <p className="text-xs text-green-600">
                      Credits: {b.credits_applied}
                    </p>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
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
