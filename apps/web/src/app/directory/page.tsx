"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DirectoryEntry, DirectorySearchResponse } from "@acroyoga/shared/types/directory";

const DEBOUNCE_MS = 300;
const ROLES = ["base", "flyer", "hybrid"] as const;
const RELATIONSHIP_OPTIONS = [
  { value: "", label: "All members" },
  { value: "friends", label: "My Friends" },
  { value: "following", label: "Following" },
  { value: "followers", label: "Followers" },
] as const;
const SORT_OPTIONS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "proximity", label: "Near me" },
] as const;

const SOCIAL_ICONS: Record<string, string> = {
  instagram: "IG",
  youtube: "YT",
  facebook: "FB",
  website: "🌐",
};

function MemberCard({
  entry,
  isOwn,
}: {
  entry: DirectoryEntry;
  isOwn: boolean;
}) {
  return (
    <article
      className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
      aria-label={`Member card for ${entry.displayName ?? "unnamed member"}`}
    >
      <div className="flex items-start gap-3">
        {entry.avatarUrl ? (
          <img
            src={entry.avatarUrl}
            alt={`${entry.displayName ?? "member"} avatar`}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <span className="text-indigo-600 text-lg font-semibold">
              {(entry.displayName ?? "?")[0]?.toUpperCase()}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            {entry.displayName ?? "Unnamed member"}
          </h2>
          {entry.homeCityName && (
            <p className="text-xs text-gray-500 truncate">{entry.homeCityName}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.defaultRole && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
                {entry.defaultRole}
              </span>
            )}
            {entry.isVerifiedTeacher && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                ✓ Verified Teacher
              </span>
            )}
            {entry.relationship !== "none" && entry.relationship !== "self" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                {entry.relationship === "friend" ? "Friends" : entry.relationship}
              </span>
            )}
          </div>
        </div>
      </div>

      {entry.bio && (
        <p className="text-xs text-gray-600 line-clamp-2">{entry.bio}</p>
      )}

      {entry.socialLinks.length > 0 && (
        <ul className="flex gap-2 list-none p-0 m-0" aria-label="Social links">
          {entry.socialLinks.map((link) => (
            <li key={link.platform}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${entry.displayName ?? "member"} on ${link.platform}`}
                className="text-xs text-gray-500 hover:text-indigo-600 px-1.5 py-0.5 rounded border border-gray-200 hover:border-indigo-300 transition-colors"
              >
                {SOCIAL_ICONS[link.platform] ?? link.platform}
              </a>
            </li>
          ))}
        </ul>
      )}

      {isOwn && (
        <div className="mt-auto pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Profile: {entry.profileCompleteness}% complete
            </span>
            {entry.profileCompleteness < 100 && (
              <Link
                href="/settings/profile"
                className="text-xs text-indigo-600 hover:underline"
              >
                Complete profile →
              </Link>
            )}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1 mt-1" role="progressbar" aria-valuenow={entry.profileCompleteness} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="bg-indigo-500 h-1 rounded-full transition-all"
              style={{ width: `${entry.profileCompleteness}%` }}
            />
          </div>
        </div>
      )}
    </article>
  );
}

export default function DirectoryPage() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [role, setRole] = useState("");
  const [relationship, setRelationship] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("name");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // My own userId (from session — we compare relationship === 'self')
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch session info to know which card is "own"
    fetch("/api/profiles/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.userId) setMyUserId(data.userId);
      })
      .catch(() => null);
  }, []);

  // Debounce search query
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const buildParams = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (role) params.set("role", role);
      if (relationship) params.set("relationship", relationship);
      if (verifiedOnly) params.set("verifiedTeacher", "true");
      if (sort !== "name") params.set("sort", sort);
      if (cursor) params.set("cursor", cursor);
      return params;
    },
    [debouncedQuery, role, relationship, verifiedOnly, sort],
  );

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams();
      const res = await fetch(`/api/directory?${params.toString()}`);
      if (res.status === 401) {
        setError("Please sign in to browse the directory.");
        return;
      }
      if (!res.ok) throw new Error("Failed to load directory");
      const data = (await res.json()) as DirectorySearchResponse;
      setEntries(data.entries);
      setNextCursor(data.nextCursor);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = buildParams(nextCursor);
      const res = await fetch(`/api/directory?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load more");
      const data = (await res.json()) as DirectorySearchResponse;
      setEntries((prev) => [...prev, ...data.entries]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [buildParams, nextCursor, loadingMore]);

  useEffect(() => {
    void fetchDirectory();
  }, [fetchDirectory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Directory</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-0.5">
              {total} {total === 1 ? "member" : "members"} found
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Search members..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search members by name or bio"
          className="border border-gray-300 px-3 py-2 rounded-md flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Filter by AcroYoga role"
          className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          aria-label="Filter by relationship"
          className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort order"
          className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-700 px-1 cursor-pointer">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            aria-label="Show verified teachers only"
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Verified teachers only
        </label>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading directory">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-600 font-medium">{error}</p>
          {error.includes("sign in") && (
            <Link
              href="/api/auth/signin"
              className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
            >
              Sign in
            </Link>
          )}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg font-medium">No members found</p>
          <p className="text-gray-400 text-sm mt-2">
            Adjust your filters or{" "}
            <Link href="/settings/profile" className="text-indigo-600 hover:underline">
              update your profile
            </Link>{" "}
            to join the directory.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <MemberCard
                key={entry.userId}
                entry={entry}
                isOwn={entry.userId === myUserId || entry.relationship === "self"}
              />
            ))}
          </div>

          {nextCursor && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                aria-label="Load more members"
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
