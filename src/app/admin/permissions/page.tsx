"use client";

import { useEffect, useState } from "react";
import type { PermissionGrant } from "@/types/permissions";

export default function AdminPermissionsPage() {
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

  if (loading) return <p className="text-gray-500">Loading permissions…</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Permission Grants</h1>

      {grants.length === 0 ? (
        <p className="text-gray-500">No active permission grants.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Granted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                    {new Date(grant.grantedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleRevoke(grant.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Revoke
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
