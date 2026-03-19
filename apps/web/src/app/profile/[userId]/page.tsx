"use client";

import { useState, useEffect, use } from "react";

interface ProfileData {
  userId: string;
  displayName: string | null;
  bio: string | null;
  homeCityName: string | null;
  defaultRole: string | null;
  avatarUrl: string | null;
  socialLinks: Array<{ platform: string; url: string; visibility: string }>;
  relationship: string;
}

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/profiles/${userId}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setProfile(data);
        setLoading(false);
      });
  }, [userId]);

  async function handleFollow() {
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followeeId: userId }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile((p) =>
        p ? { ...p, relationship: data.becameFriends ? "friend" : "following" } : p,
      );
    }
  }

  async function handleUnfollow() {
    await fetch(`/api/follows/${userId}`, { method: "DELETE" });
    setProfile((p) => (p ? { ...p, relationship: "none" } : p));
  }

  async function handleBlock() {
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedId: userId }),
    });
    setNotFound(true);
  }

  async function handleMute() {
    await fetch("/api/mutes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutedId: userId }),
    });
  }

  async function handleReport() {
    const reason = prompt("Reason: harassment, spam, inappropriate, other");
    if (!reason) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId: userId, reason }),
    });
    alert("Report submitted.");
  }

  if (loading) {
    return <div className="p-6 max-w-2xl mx-auto animate-pulse"><div className="h-8 bg-gray-200 rounded w-48 mb-4" /></div>;
  }

  if (notFound || !profile) {
    return <div className="p-6 max-w-2xl mx-auto"><h1 className="text-2xl">User not found</h1></div>;
  }

  const roleLabel: Record<string, string> = {
    none: "Follow",
    following: "Following",
    follower: "Follow back",
    friend: "Friends",
    self: "",
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-start gap-4">
        {profile.avatarUrl && (
          <img src={profile.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName ?? "Anonymous"}</h1>
          {profile.homeCityName && <p className="text-gray-600">{profile.homeCityName}</p>}
          {profile.defaultRole && (
            <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded capitalize">
              {profile.defaultRole}
            </span>
          )}
        </div>
      </div>

      {profile.bio && <p className="mt-4 text-gray-700">{profile.bio}</p>}

      {profile.socialLinks.length > 0 && (
        <div className="mt-4 space-y-1">
          <h2 className="text-sm font-medium text-gray-500">Links</h2>
          {profile.socialLinks.map((link) => (
            <a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline text-sm capitalize"
            >
              {link.platform}
            </a>
          ))}
        </div>
      )}

      {profile.relationship !== "self" && (
        <div className="mt-6 flex gap-2">
          {profile.relationship === "none" || profile.relationship === "follower" ? (
            <button onClick={handleFollow} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              {roleLabel[profile.relationship]}
            </button>
          ) : (
            <button onClick={handleUnfollow} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
              {roleLabel[profile.relationship]}
            </button>
          )}
          <button onClick={handleBlock} className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200">Block</button>
          <button onClick={handleMute} className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded hover:bg-yellow-200">Mute</button>
          <button onClick={handleReport} className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200">Report</button>
        </div>
      )}
    </div>
  );
}
