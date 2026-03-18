"use client";

import { useEffect, useState } from "react";

interface ExpiringCert {
  id: string;
  teacher_profile_id: string;
  certification_name: string;
  issuing_body: string;
  expiry_date: string;
  status: string;
  display_name?: string;
}

export default function AdminExpiringCertsPage() {
  const [certs, setCerts] = useState<ExpiringCert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/certifications/expiring")
      .then((r) => r.json())
      .then((data) => {
        setCerts(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Expiring Certifications</h1>

      {certs.length === 0 ? (
        <p className="text-gray-500">No certifications expiring soon.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Teacher</th>
              <th className="text-left p-2">Certification</th>
              <th className="text-left p-2">Issuing Body</th>
              <th className="text-left p-2">Expiry Date</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {certs.map((c) => {
              const daysLeft = Math.ceil(
                (new Date(c.expiry_date).getTime() - Date.now()) / 86400000,
              );
              return (
                <tr key={c.id} className="border-b">
                  <td className="p-2">{c.display_name ?? c.teacher_profile_id}</td>
                  <td className="p-2">{c.certification_name}</td>
                  <td className="p-2">{c.issuing_body}</td>
                  <td className="p-2">
                    {new Date(c.expiry_date).toLocaleDateString()}
                    <span
                      className={`ml-2 text-sm ${daysLeft <= 7 ? "text-red-600" : "text-yellow-600"}`}
                    >
                      ({daysLeft}d)
                    </span>
                  </td>
                  <td className="p-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        c.status === "verified"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
