"use client";

import { useSearchParams, useRouter } from "next/navigation";
import type { EventCategory, SkillLevel } from "@acroyoga/shared/types/events";

const CATEGORIES: EventCategory[] = ["jam", "workshop", "class", "festival", "social", "retreat", "teacher_training"];
const SKILL_LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced", "all_levels"];
const STATUS_PILLS = ["new", "full", "past", "booked", "interested"] as const;

export default function EventFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/events?${params.toString()}`);
  }

  function toggleStatus(pill: string) {
    const current = searchParams.get("status")?.split(",") ?? [];
    const updated = current.includes(pill)
      ? current.filter((s) => s !== pill)
      : [...current, pill];
    setFilter("status", updated.length > 0 ? updated.join(",") : null);
  }

  const activeCategory = searchParams.get("category");
  const activeSkill = searchParams.get("skillLevel");
  const activeStatuses = searchParams.get("status")?.split(",") ?? [];

  return (
    <div className="space-y-4" role="search" aria-label="Event filters">
      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill}
            onClick={() => toggleStatus(pill)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              activeStatuses.includes(pill)
                ? "bg-primary text-white border-primary"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
            aria-pressed={activeStatuses.includes(pill)}
            aria-label={`Filter by ${pill}`}
          >
            {pill.charAt(0).toUpperCase() + pill.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Category filter */}
        <select
          value={activeCategory ?? ""}
          onChange={(e) => setFilter("category", e.target.value || null)}
          className="border border-border rounded-md px-3 py-1.5 text-sm"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace("_", " ")}</option>
          ))}
        </select>

        {/* Skill level filter */}
        <select
          value={activeSkill ?? ""}
          onChange={(e) => setFilter("skillLevel", e.target.value || null)}
          className="border border-border rounded-md px-3 py-1.5 text-sm"
          aria-label="Filter by skill level"
        >
          <option value="">All levels</option>
          {SKILL_LEVELS.map((l) => (
            <option key={l} value={l}>{l.replace("_", " ")}</option>
          ))}
        </select>

        {/* Date range */}
        <input
          type="date"
          value={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => setFilter("dateFrom", e.target.value || null)}
          className="border border-border rounded-md px-3 py-1.5 text-sm"
          aria-label="Filter from date"
        />
        <input
          type="date"
          value={searchParams.get("dateTo") ?? ""}
          onChange={(e) => setFilter("dateTo", e.target.value || null)}
          className="border border-border rounded-md px-3 py-1.5 text-sm"
          aria-label="Filter to date"
        />
      </div>
    </div>
  );
}
