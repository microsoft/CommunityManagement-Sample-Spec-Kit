"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { DirectoryEntry, DirectoryResponse } from "@acroyoga/shared/types/directory";
import { DIRECTORY_MESSAGES as msg } from "./directory-messages";

const DEBOUNCE_MS = 300;
const ROLES = ["base", "flyer", "hybrid"] as const;
const RELATIONSHIP_OPTIONS = [
  { value: "", label: msg.tabAll },
  { value: "friends", label: msg.tabFriends },
  { value: "following", label: msg.tabFollowing },
  { value: "followers", label: msg.tabFollowers },
  { value: "blocked", label: msg.tabBlocked },
] as const;
const SORT_OPTIONS = [
  { value: "alphabetical", label: msg.sortName },
  { value: "recent", label: msg.sortRecent },
  { value: "proximity", label: msg.sortNearMe },
] as const;

const SOCIAL_ICONS: Record<string, string> = {
  instagram: "IG",
  youtube: "YT",
  facebook: "FB",
  website: "\uD83C\uDF10",
  tiktok: "TT",
  twitter_x: "X",
  linkedin: "in",
  threads: "@",
};

function MemberCard({
  entry,
  onFollow,
  onUnfollow,
  onBlock,
  onUnblock,
}: {
  entry: DirectoryEntry;
  onFollow?: (userId: string) => void;
  onUnfollow?: (userId: string) => void;
  onBlock?: (userId: string) => void;
  onUnblock?: (userId: string) => void;
}) {
  const isFollowing = entry.relationshipStatus === "following" || entry.relationshipStatus === "friend";
  const isBlocked = entry.relationshipStatus === "blocked";

  return (
    <article
      className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
      aria-label={`Member card for ${entry.displayName ?? "unnamed member"}`}
    >
      <div className="flex items-start gap-3">
        {entry.avatarUrl ? (
          <Image
            src={entry.avatarUrl}
            alt={`${entry.displayName ?? "member"} avatar`}
            width={48}
            height={48}
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
            {entry.displayName ?? msg.unnamedMember}
          </h2>
          {(entry.homeCity || entry.homeCountry) && (
            <p className="text-xs text-gray-500 truncate">
              {[entry.homeCity, entry.homeCountry].filter(Boolean).join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {entry.defaultRole && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 capitalize">
                {entry.defaultRole}
              </span>
            )}
            {entry.isVerifiedTeacher && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                {msg.verifiedTeacher}
              </span>
            )}
            {entry.relationshipStatus !== "none" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                {entry.relationshipStatus === "friend" ? "Friends" : entry.relationshipStatus === "follows_me" ? "Follows you" : entry.relationshipStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {entry.visibleSocialLinks.length > 0 && (
        <ul className="flex gap-2 list-none p-0 m-0" aria-label="Social links">
          {entry.visibleSocialLinks.map((link) => (
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

      <div className="flex gap-2 mt-auto pt-1 border-t border-gray-100">
        {isBlocked ? (
          <button
            onClick={() => onUnblock?.(entry.userId)}
            className="text-xs text-red-600 hover:text-red-800 hover:underline"
            aria-label={`${msg.unblock} ${entry.displayName ?? "member"}`}
          >
            {msg.unblock}
          </button>
        ) : (
          <>
            {isFollowing ? (
              <button
                onClick={() => onUnfollow?.(entry.userId)}
                className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
                aria-label={`${msg.unfollow} ${entry.displayName ?? "member"}`}
              >
                {msg.unfollow}
              </button>
            ) : (
              <button
                onClick={() => onFollow?.(entry.userId)}
                className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                aria-label={`${msg.follow} ${entry.displayName ?? "member"}`}
              >
                {msg.follow}
              </button>
            )}
            <button
              onClick={() => onBlock?.(entry.userId)}
              className="text-xs text-gray-400 hover:text-red-600 hover:underline ml-auto"
              aria-label={`${msg.block} ${entry.displayName ?? "member"}`}
            >
              {msg.block}
            </button>
          </>
        )}
      </div>

    </article>
  );
}

export default function DirectoryPage() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [role, setRole] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [continent, setContinent] = useState("");
  const [relationship, setRelationship] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("alphabetical");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const hasActiveFilters = !!(debouncedQuery || role || city || country || continent || relationship || verifiedOnly);

  const clearAllFilters = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setRole("");
    setCity("");
    setCountry("");
    setContinent("");
    setRelationship("");
    setVerifiedOnly(false);
  }, []);

  const buildParams = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("search", debouncedQuery);
      if (role) params.set("role", role);
      if (city) params.set("city", city);
      if (country) params.set("country", country);
      if (continent) params.set("continent", continent);
      if (relationship) params.set("relationship", relationship);
      if (verifiedOnly) params.set("teachersOnly", "true");
      if (sort !== "alphabetical") params.set("sort", sort);
      if (cursor) params.set("cursor", cursor);
      return params;
    },
    [debouncedQuery, role, city, country, continent, relationship, verifiedOnly, sort],
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
      const data = (await res.json()) as DirectoryResponse;
      setEntries(data.entries);
      setNextCursor(data.nextCursor);
      setHasNextPage(data.hasNextPage);
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
      const data = (await res.json()) as DirectoryResponse;
      setEntries((prev) => [...prev, ...data.entries]);
      setNextCursor(data.nextCursor);
      setHasNextPage(data.hasNextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [buildParams, nextCursor, loadingMore]);

  useEffect(() => {
    void fetchDirectory();
  }, [fetchDirectory]);

  const handleFollow = useCallback(async (targetUserId: string) => {
    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.userId === targetUserId
          ? { ...e, relationshipStatus: e.relationshipStatus === "follows_me" ? "friend" : "following" }
          : e,
      ),
    );
    try {
      await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followeeId: targetUserId }),
      });
    } catch {
      void fetchDirectory();
    }
  }, [fetchDirectory]);

  const handleUnfollow = useCallback(async (targetUserId: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.userId === targetUserId
          ? { ...e, relationshipStatus: e.relationshipStatus === "friend" ? "follows_me" : "none" }
          : e,
      ),
    );
    try {
      await fetch(`/api/follows/${targetUserId}`, { method: "DELETE" });
    } catch {
      void fetchDirectory();
    }
  }, [fetchDirectory]);

  const handleBlock = useCallback(async (targetUserId: string) => {
    if (!confirm(msg.blockConfirm)) return;
    // Optimistic: remove from list
    setEntries((prev) => prev.filter((e) => e.userId !== targetUserId));
    try {
      await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: targetUserId }),
      });
    } catch {
      void fetchDirectory();
    }
  }, [fetchDirectory]);

  const handleUnblock = useCallback(async (targetUserId: string) => {
    setEntries((prev) => prev.filter((e) => e.userId !== targetUserId));
    try {
      await fetch(`/api/blocks/${targetUserId}`, { method: "DELETE" });
    } catch {
      void fetchDirectory();
    }
  }, [fetchDirectory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <a
        href="#directory-results"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-indigo-600 focus:font-medium"
      >
        Skip to directory results
      </a>
      <div className="sr-only" role="status" aria-live="polite">
        {!loading && !error && `${entries.length} members shown`}
      </div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{msg.pageTitle}</h1>
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

        <input
          type="text"
          placeholder={msg.filterCity}
          value={city}
          onChange={(e) => { setCity(e.target.value); setCountry(""); setContinent(""); }}
          aria-label={msg.filterCity}
          className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />

        <input
          type="text"
          placeholder={msg.filterCountry}
          value={country}
          onChange={(e) => { setCountry(e.target.value); setCity(""); setContinent(""); }}
          aria-label={msg.filterCountry}
          className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />

        <input
          type="text"
          placeholder={msg.filterContinent}
          value={continent}
          onChange={(e) => { setContinent(e.target.value); setCity(""); setCountry(""); }}
          aria-label={msg.filterContinent}
          className="border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />

        <label className="flex items-center gap-2 text-sm text-gray-700 px-1 cursor-pointer">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            aria-label={msg.teachersOnly}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          {msg.teachersOnly}
        </label>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline px-2 py-2"
            aria-label={msg.clearAll}
          >
            {msg.clearAll}
          </button>
        )}
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
          <div id="directory-results" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="region" aria-label="Directory results">
            {entries.map((entry) => (
              <MemberCard
                key={entry.userId}
                entry={entry}
                onFollow={(id) => void handleFollow(id)}
                onUnfollow={(id) => void handleUnfollow(id)}
                onBlock={(id) => void handleBlock(id)}
                onUnblock={(id) => void handleUnblock(id)}
              />
            ))}
          </div>

          {hasNextPage && nextCursor && (
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
