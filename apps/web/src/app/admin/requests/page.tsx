"use client";

import { useEffect, useState } from "react";
import type { PermissionRequest } from "@acroyoga/shared/types/requests";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await fetch("/api/permissions/requests?status=pending");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRequests(data.requests);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load requests");
      } finally {
        setLoading(false);
      }
    }
    fetchRequests();
  }, []);

  async function handleReview(requestId: string, decision: "approved" | "rejected") {
    const reason = decision === "rejected" ? prompt("Reason for rejection:") : undefined;
    try {
      const res = await fetch(`/api/permissions/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || "Review failed");
        return;
      }
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      alert("Network error");
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading requests">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
        <p className="sr-only">Loading requests…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-md bg-red-50 p-4">
        <h3 className="text-sm font-medium text-red-800">Error loading requests</h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Pending Role Requests</h1>

      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white shadow rounded-lg p-6" role="article" aria-label={`Request from user ${req.userId.slice(0, 8)} for ${req.requestedRole} in ${req.scopeValue}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-mono text-gray-500">User: {req.userId.slice(0, 8)}…</p>
                  <p className="mt-1 text-sm">
                    Requesting <span className="font-semibold">{req.requestedRole}</span> for{" "}
                    <span className="font-semibold">{req.scopeValue}</span>
                  </p>
                  {req.message && <p className="mt-2 text-sm text-gray-600 italic">&ldquo;{req.message}&rdquo;</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    Submitted {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2" role="group" aria-label="Review actions">
                  <button
                    onClick={() => handleReview(req.id, "approved")}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    aria-label={`Approve request for ${req.requestedRole} in ${req.scopeValue}`}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview(req.id, "rejected")}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                    aria-label={`Reject request for ${req.requestedRole} in ${req.scopeValue}`}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
