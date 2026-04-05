"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import type { PermissionGrant } from "@acroyoga/shared/types/permissions";
import { formatEventDate } from "@acroyoga/shared/utils/format";
import { ADMIN_MESSAGES as msg } from "../admin-messages";

export default function AdminPermissionsPage() {
  const locale = useLocale();
  const [grants, setGrants] = useState<PermissionGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGrants() {
      try {
        const res = await fetch("/api/permissions/grants");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setGrants(data.grants);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load grants");
      } finally {
        setLoading(false);
      }
    }
    fetchGrants();
  }, []);

  async function handleRevoke(grantId: string) {
    if (!confirm("Revoke this permission grant?")) return;
    try {
      const res = await fetch("/api/permissions/grants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error?.message || "Revoke failed");
        return;
      }
      setGrants((prev) => prev.filter((g) => g.id !== grantId));
    } catch {
      alert("Network error");
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading permissions">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
        <p className="sr-only">Loading permissions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ms-3">
            <h3 className="text-sm font-medium text-red-800">{msg.errorLoadingPermissions}</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
            >
              {msg.tryAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{msg.permissionGrants}</h1>

      {grants.length === 0 ? (
        <p className="text-gray-500">{msg.noActiveGrants}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Permission grants">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{msg.tableUser}</th>
                <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{msg.tableRole}</th>
                <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{msg.tableScope}</th>
                <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{msg.tableGranted}</th>
                <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase">{msg.tableActions}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grants.map((grant) => (
                <tr key={grant.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{grant.userId.slice(0, 8)}…</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {grant.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {grant.scopeType}
                    {grant.scopeValue ? ` / ${grant.scopeValue}` : ""}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatEventDate(grant.grantedAt, locale, undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleRevoke(grant.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                      aria-label={`Revoke ${grant.role} permission for ${grant.scopeValue || 'global'}`}
                    >
                      {msg.revoke}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
