"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { formatEventDate } from "@acroyoga/shared/utils/format";
import { SETTINGS_MESSAGES as msg } from "../settings-messages";

interface ExportEntry {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export default function AccountSettingsPage() {
  const locale = useLocale();
  const [exports, setExports] = useState<ExportEntry[]>([]);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/exports")
      .then((r) => r.json())
      .then((data) => {
        setExports(data.exports ?? []);
        setLoading(false);
      });
  }, []);

  async function requestExport() {
    setExporting(true);
    const res = await fetch("/api/account/export", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setExports((prev) => [
        { id: data.exportId, status: data.status, createdAt: new Date().toISOString(), completedAt: null },
        ...prev,
      ]);
    }
    setExporting(false);
  }

  async function handleDelete() {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
    window.location.href = "/";
  }

  if (loading) {
    return <div className="p-6 max-w-2xl mx-auto animate-pulse"><div className="h-8 bg-gray-200 rounded w-48 mb-4" /></div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{msg.accountTitle}</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">{msg.dataExport}</h2>
        <p className="text-sm text-gray-600 mb-3">
          {msg.dataExportDesc}
        </p>
        <button
          onClick={requestExport}
          disabled={exporting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {exporting ? msg.exporting : msg.exportMyData}
        </button>

        {exports.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-500">{msg.exportHistory}</h3>
            {exports.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <span className={`text-sm px-2 py-0.5 rounded ${
                    exp.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {exp.status}
                  </span>
                  <span className="text-xs text-gray-400 ms-2">
                    {formatEventDate(exp.createdAt, locale, undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
                {exp.status === "completed" && (
                  <a href={`/api/account/exports/${exp.id}/download`} className="text-sm text-blue-600 hover:underline">
                    {msg.download}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-3 text-red-600">{msg.deleteAccount}</h2>
        <p className="text-sm text-gray-600 mb-3">
          {msg.deleteAccountDesc}
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={msg.deleteConfirmPlaceholder}
            className="border rounded px-3 py-2 w-48"
            aria-label="Deletion confirmation"
          />
          <button
            onClick={handleDelete}
            disabled={deleting || deleteConfirm !== "DELETE"}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? msg.deleting : msg.deleteMyAccount}
          </button>
        </div>
      </section>
    </div>
  );
}
