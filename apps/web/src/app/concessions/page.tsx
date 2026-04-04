"use client";

import { useEffect, useState } from "react";
import { formatEventDate } from "@acroyoga/shared/utils/format";
import { CONCESSION_MESSAGES as msg } from "./concession-messages";

interface ConcessionStatus {
  id: string;
  status: string;
  evidence: string;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

export default function ConcessionPage() {
  const [concession, setConcession] = useState<ConcessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/concessions")
      .then((res) => res.json())
      .then((data) => {
        setConcession(data);
        setLoading(false);
      });
  }, []);

  const handleApply = async () => {
    setSubmitting(true);
    const res = await fetch("/api/concessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidence }),
    });
    if (res.ok) {
      const data = await res.json();
      setConcession(data);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-6">{msg.loading}</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{msg.title}</h1>

      {concession ? (
        <div className="border rounded-lg p-4">
          <p className="font-semibold capitalize">{msg.status} {concession.status}</p>
          <p className="text-sm text-gray-600 mt-1">{msg.evidence} {concession.evidence}</p>
          <p className="text-xs text-gray-400 mt-1">
            {msg.applied} {formatEventDate(concession.created_at, "en", undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
          {concession.approved_at && (
            <p className="text-xs text-green-600">
              Approved: {formatEventDate(concession.approved_at, "en", undefined, { year: "numeric", month: "short", day: "numeric" })}
            </p>
          )}
          {concession.rejected_at && (
            <p className="text-xs text-red-600">
              Rejected: {formatEventDate(concession.rejected_at, "en", undefined, { year: "numeric", month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">
            {msg.applyDesc}
          </p>
          <textarea
            className="w-full border rounded-lg p-3 min-h-[100px]"
            placeholder="Describe your eligibility (e.g., student ID, senior status)"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
          <button
            onClick={handleApply}
            disabled={submitting || !evidence.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? msg.submitting : msg.applyButton}
          </button>
        </div>
      )}
    </div>
  );
}
