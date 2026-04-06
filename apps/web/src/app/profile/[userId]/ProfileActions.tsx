"use client";

import { useState } from "react";
import { PROFILE_MESSAGES as msg } from "../profile-messages";

interface ProfileActionsProps {
  userId: string;
  initialRelationship: string;
}

export default function ProfileActions({ userId, initialRelationship }: ProfileActionsProps) {
  const [relationship, setRelationship] = useState(initialRelationship);
  const [hidden, setHidden] = useState(false);

  async function handleFollow() {
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followeeId: userId }),
    });
    if (res.ok) {
      const data = await res.json();
      setRelationship(data.becameFriends ? "friend" : "following");
    }
  }

  async function handleUnfollow() {
    await fetch(`/api/follows/${userId}`, { method: "DELETE" });
    setRelationship("none");
  }

  async function handleBlock() {
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedId: userId }),
    });
    setHidden(true);
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

  if (hidden) return null;

  const roleLabel: Record<string, string> = {
    none: msg.follow,
    following: msg.following,
    follower: msg.followBack,
    friend: msg.friends,
    self: "",
  };

  if (relationship === "self") return null;

  return (
    <div className="mt-6 flex gap-2">
      {relationship === "none" || relationship === "follower" ? (
        <button onClick={handleFollow} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {roleLabel[relationship]}
        </button>
      ) : (
        <button onClick={handleUnfollow} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
          {roleLabel[relationship]}
        </button>
      )}
      <button onClick={handleBlock} className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200">{msg.block}</button>
      <button onClick={handleMute} className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded hover:bg-yellow-200">{msg.mute}</button>
      <button onClick={handleReport} className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200">{msg.report}</button>
    </div>
  );
}
