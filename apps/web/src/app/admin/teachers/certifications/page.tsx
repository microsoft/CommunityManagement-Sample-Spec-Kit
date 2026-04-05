"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { formatEventDate } from "@acroyoga/shared/utils/format";
import { CERTIFICATION_MESSAGES as msg } from "./certification-messages";

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
  const locale = useLocale();
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

  if (loading) return <div className="p-6">{msg.loading}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{msg.pageTitle}</h1>

      {certs.length === 0 ? (
        <p className="text-gray-500">{msg.noCertifications}</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-start p-2">{msg.thTeacher}</th>
              <th className="text-start p-2">{msg.thCertification}</th>
              <th className="text-start p-2">{msg.thIssuingBody}</th>
              <th className="text-start p-2">{msg.thExpiryDate}</th>
              <th className="text-start p-2">{msg.thStatus}</th>
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
                    {formatEventDate(c.expiry_date, locale, undefined, { year: "numeric", month: "short", day: "numeric" })}
                    <span
                      className={`ms-2 text-sm ${daysLeft <= 7 ? "text-red-600" : "text-yellow-600"}`}
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
