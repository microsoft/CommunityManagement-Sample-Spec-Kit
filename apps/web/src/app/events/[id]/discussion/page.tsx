"use client";

import { useState, useEffect, use } from "react";
import { useLocale } from "next-intl";
import { formatEventDate } from "@acroyoga/shared/utils/format";
import { DISCUSSION_MESSAGES as msg } from "./discussion-messages";

interface MessageData {
  id: string;
  authorId: string;
  authorName: string | null;
  content: string;
  isPinned: boolean;
  isDeleted: boolean;
  reactions: Array<{ emoji: string; count: number; reacted: boolean }>;
  createdAt: string;
  editedAt: string | null;
}

export default function EventDiscussionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const locale = useLocale();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [canPost, setCanPost] = useState(false);
  const [postReason, setPostReason] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Get or create thread for this event
    fetch(`/api/threads/by-entity/event/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        setThreadId(data.thread.id);
        return fetch(`/api/threads/${data.thread.id}/messages`);
      })
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages ?? []);
        setLoading(false);
      });

    // Check if user has RSVP (can post)
    fetch(`/api/events/${eventId}/rsvp`)
      .then((r) => r.json())
      .then((data) => {
        if (data.rsvps?.length > 0) {
          setCanPost(true);
        } else {
          setCanPost(false);
          setPostReason(msg.rsvpRequired);
        }
      })
      .catch(() => {
        setCanPost(false);
        setPostReason(msg.notAuthenticated);
      });
  }, [eventId]);

  async function sendMessage() {
    if (!threadId || !newMessage.trim()) return;
    setSending(true);
    const res = await fetch(`/api/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMessage }),
    });
    if (res.ok) {
      const newMsg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
    }
    setSending(false);
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!threadId) return;
    const res = await fetch(`/api/threads/${threadId}/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions.map((r) =>
            r.emoji === emoji ? { ...r, count: data.count, reacted: data.action === "added" } : r,
          );
          if (!reactions.find((r) => r.emoji === emoji) && data.action === "added") {
            reactions.push({ emoji, count: data.count, reacted: true });
          }
          return { ...m, reactions: reactions.filter((r) => r.count > 0) };
        }),
      );
    }
  }

  const pinnedMessages = messages.filter((m) => m.isPinned);
  const regularMessages = messages.filter((m) => !m.isPinned);

  if (loading) {
    return <div className="p-6 max-w-3xl mx-auto animate-pulse"><div className="h-8 bg-gray-200 rounded w-64 mb-4" /></div>;
  }

  const emojiLabels: Record<string, string> = {
    thumbs_up: "👍", heart: "❤️", fire: "🔥", laugh: "😂", sad: "😢", celebrate: "🎉",
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{msg.title}</h1>

      {pinnedMessages.length > 0 && (
        <div className="mb-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500">{msg.pinned}</h2>
          {pinnedMessages.map((m) => (
            <div key={m.id} className="border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded">
              <div className="text-sm font-medium">{m.authorName ?? msg.unknownAuthor}</div>
              <p className="text-sm">{m.content}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 mb-6">
        {regularMessages.map((m) => (
          <div key={m.id} className={`p-3 rounded border ${m.isDeleted ? "opacity-50" : ""}`}>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium">{m.authorName ?? msg.unknownAuthor}</span>
              <span className="text-xs text-gray-500">
                {formatEventDate(m.createdAt, locale)}
                {m.editedAt && " (edited)"}
              </span>
            </div>
            <p className="text-sm mt-1">{m.content}</p>
            {!m.isDeleted && (
              <div className="flex gap-1 mt-2">
                {Object.entries(emojiLabels).map(([emoji, label]) => {
                  const reaction = m.reactions.find((r) => r.emoji === emoji);
                  return (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(m.id, emoji)}
                      className={`text-xs px-2 py-0.5 rounded border ${
                        reaction?.reacted ? "bg-blue-100 border-blue-300" : "bg-gray-50 border-gray-200"
                      } hover:bg-blue-50`}
                      aria-label={`React with ${emoji}`}
                    >
                      {label} {reaction?.count ? reaction.count : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No messages yet. Start the discussion!</p>
        )}
      </div>

      <div className="border-t pt-4">
        {canPost ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 border rounded px-3 py-2"
              maxLength={2000}
              aria-label="Message input"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? msg.sending : msg.send}
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center">{postReason ?? "Cannot post"}</p>
        )}
      </div>
    </div>
  );
}
