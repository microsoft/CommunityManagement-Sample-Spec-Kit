"use client";

import { useEffect, useState } from "react";

interface TeacherRequest {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  specialties: string[];
  credentials: Array<{
    certificationName: string;
    issuingBody: string;
    expiryDate?: string;
  }>;
  status: string;
  created_at: string;
}

export default function AdminTeachersPage() {
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teachers/requests")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setRequests(data.requests ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleReview(requestId: string, decision: "approved" | "rejected") {
    const reason = decision === "rejected" ? prompt("Reason for rejection:") : undefined;
    if (decision === "rejected" && !reason) return;

    const res = await fetch(`/api/teachers/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason }),
    });

    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      const data = await res.json();
      alert(data.error ?? "Review failed");
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Teacher Applications</h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">No pending applications.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="border rounded p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="font-semibold">{r.display_name}</h2>
                  <p className="text-sm text-gray-500">
                    Applied {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {r.bio && <p className="text-gray-700 text-sm mb-2">{r.bio}</p>}

              {r.specialties.length > 0 && (
                <div className="flex gap-1 mb-2">
                  {r.specialties.map((s) => (
                    <span
                      key={s}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {r.credentials.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-sm font-medium mb-1">Credentials:</h3>
                  {r.credentials.map((c, i) => (
                    <div key={i} className="text-sm text-gray-600 ml-2">
                      • {c.certificationName} ({c.issuingBody})
                      {c.expiryDate && ` — expires ${c.expiryDate}`}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleReview(r.id, "approved")}
                  className="bg-green-600 text-white px-4 py-1.5 rounded text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(r.id, "rejected")}
                  className="bg-red-600 text-white px-4 py-1.5 rounded text-sm"
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
