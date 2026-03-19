"use client";

import { useEffect, useState } from "react";

interface ConcessionStatus {
  id: string;
  user_id: string;
  status: string;
  evidence: string;
  created_at: string;
}

export default function AdminConcessionsPage() {
  const [pending, setPending] = useState<ConcessionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/concessions?pending=true")
      .then((res) => res.json())
      .then((data) => {
        setPending(data);
        setLoading(false);
      });
  }, []);

  const handleReview = async (
    concessionId: string,
    decision: "approved" | "rejected",
  ) => {
    const res = await fetch(`/api/concessions/${concessionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      setPending((prev) => prev.filter((c) => c.id !== concessionId));
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pending Concession Applications</h1>
      {pending.length === 0 ? (
        <p className="text-gray-500">No pending applications.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((c) => (
            <div key={c.id} className="border rounded-lg p-4">
              <p className="text-sm text-gray-500">User: {c.user_id}</p>
              <p className="mt-1">{c.evidence}</p>
              <p className="text-xs text-gray-400 mt-1">
                Applied: {new Date(c.created_at).toLocaleDateString()}
              </p>
              <div className="mt-3 space-x-2">
                <button
                  onClick={() => handleReview(c.id, "approved")}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(c.id, "rejected")}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
