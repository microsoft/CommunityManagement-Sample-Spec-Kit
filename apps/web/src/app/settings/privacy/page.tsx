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

  useEffect(() => {
    Promise.all([
      fetch("/api/blocks").then((r) => r.json()),
      fetch("/api/mutes").then((r) => r.json()),
    ]).then(([blocksData, mutesData]) => {
      setBlocks(blocksData.blocks ?? []);
      setMutes(mutesData.mutes ?? []);
      setLoading(false);
    });
  }, []);

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
