"use client";

import { useState, useEffect } from "react";

interface BlockEntry {
  userId: string;
  displayName: string | null;
  blockedAt: string;
}

interface MuteEntry {
  userId: string;
  displayName: string | null;
  mutedAt: string;
}

export default function PrivacySettingsPage() {
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [mutes, setMutes] = useState<MuteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [directoryVisible, setDirectoryVisible] = useState(false);
  const [directoryUpdating, setDirectoryUpdating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/blocks").then((r) => r.json()),
      fetch("/api/mutes").then((r) => r.json()),
      fetch("/api/directory/visibility").then((r) => (r.ok ? r.json() : { visible: false })),
    ]).then(([blocksData, mutesData, visibilityData]) => {
      setBlocks(blocksData.blocks ?? []);
      setMutes(mutesData.mutes ?? []);
      setDirectoryVisible(visibilityData.visible ?? false);
      setLoading(false);
    });
  }, []);

  async function toggleDirectoryVisibility(visible: boolean) {
    setDirectoryUpdating(true);
    try {
      const res = await fetch("/api/directory/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible }),
      });
      if (res.ok) {
        const data = (await res.json()) as { visible: boolean };
        setDirectoryVisible(data.visible);
      }
    } finally {
      setDirectoryUpdating(false);
    }
  }

  async function unblock(blockedId: string) {
    await fetch(`/api/blocks/${blockedId}`, { method: "DELETE" });
    setBlocks((prev) => prev.filter((b) => b.userId !== blockedId));
  }

  async function unmute(mutedId: string) {
    await fetch(`/api/mutes/${mutedId}`, { method: "DELETE" });
    setMutes((prev) => prev.filter((m) => m.userId !== mutedId));
  }

  if (loading) {
    return <div className="p-6 max-w-2xl mx-auto animate-pulse"><div className="h-8 bg-gray-200 rounded w-48 mb-4" /></div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Privacy Settings</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Community Directory</h2>
        <div className="border border-gray-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={directoryVisible}
                onChange={(e) => void toggleDirectoryVisibility(e.target.checked)}
                disabled={directoryUpdating}
                aria-label="Show me in the community directory"
                className="sr-only"
              />
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  directoryVisible ? "bg-indigo-600" : "bg-gray-300"
                } ${directoryUpdating ? "opacity-50" : ""}`}
                aria-hidden="true"
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    directoryVisible ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-900">Show me in the community directory</p>
              <p className="text-sm text-gray-500 mt-0.5">
                When enabled, other members can find your profile in the community directory.
                Blocked users will never see your profile.
              </p>
            </div>
          </label>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Blocked Users ({blocks.length})</h2>
        {blocks.length === 0 ? (
          <p className="text-gray-500 text-sm">No blocked users.</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((b) => (
              <li key={b.userId} className="flex items-center justify-between border rounded p-3">
                <span>{b.displayName ?? b.userId}</span>
                <button onClick={() => unblock(b.userId)} className="text-sm text-blue-600 hover:underline">Unblock</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Muted Users ({mutes.length})</h2>
        {mutes.length === 0 ? (
          <p className="text-gray-500 text-sm">No muted users.</p>
        ) : (
          <ul className="space-y-2">
            {mutes.map((m) => (
              <li key={m.userId} className="flex items-center justify-between border rounded p-3">
                <span>{m.displayName ?? m.userId}</span>
                <button onClick={() => unmute(m.userId)} className="text-sm text-blue-600 hover:underline">Unmute</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 text-sm text-gray-500">
        <a href="/profile" className="text-blue-600 hover:underline">Manage social link visibility →</a>
      </div>
    </div>
  );
}
