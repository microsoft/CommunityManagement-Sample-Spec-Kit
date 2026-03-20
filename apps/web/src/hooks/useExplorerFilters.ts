"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { EventCategory } from "@acroyoga/shared/types/events";
import type {
  ExplorerFilterState,
  ExplorerFilterActions,
  CalendarViewMode,
  DateQuickPick,
} from "@acroyoga/shared/types/explorer";
import { ALL_CATEGORIES } from "@/lib/category-colors";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addDays,
  nextSaturday,
  nextSunday,
  isSaturday,
} from "date-fns";

const VALID_VIEWS: CalendarViewMode[] = ["month", "week", "list", "agenda"];

function parseCategories(param: string | null): EventCategory[] {
  if (!param) return ALL_CATEGORIES;
  return param.split(",").filter((c): c is EventCategory =>
    ALL_CATEGORIES.includes(c as EventCategory)
  );
}

function parseView(param: string | null): CalendarViewMode {
  if (param && VALID_VIEWS.includes(param as CalendarViewMode)) {
    return param as CalendarViewMode;
  }
  return "month";
}

export function useExplorerFilters(): ExplorerFilterState & ExplorerFilterActions {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: ExplorerFilterState = useMemo(() => ({
    categories: parseCategories(searchParams.get("categories")),
    location: searchParams.get("location"),
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    view: parseView(searchParams.get("view")),
    skillLevel: (searchParams.get("skillLevel") as ExplorerFilterState["skillLevel"]) ?? null,
    status: searchParams.get("status")?.split(",").filter(Boolean) ?? [],
    q: searchParams.get("q"),
    page: Number(searchParams.get("page")) || 1,
  }), [searchParams]);

  const updateParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      updater(params);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const setFilter = useCallback(
    <K extends keyof ExplorerFilterState>(key: K, value: ExplorerFilterState[K]) => {
      updateParams((params) => {
        if (key !== "page") {
          params.delete("page");
        }

        if (value === null || value === undefined || value === "") {
          params.delete(key);
          return;
        }

        if (Array.isArray(value)) {
          if (value.length === 0) {
            params.delete(key);
          } else {
            params.set(key, value.join(","));
          }
          return;
        }

        params.set(key, String(value));
      });
    },
    [updateParams]
  );

  const toggleCategory = useCallback(
    (category: EventCategory) => {
      updateParams((params) => {
        params.delete("page");
        const current = parseCategories(params.get("categories"));
        let updated: EventCategory[];

        if (current.includes(category)) {
          updated = current.filter((c) => c !== category);
        } else {
          updated = [...current, category];
        }

        if (updated.length === ALL_CATEGORIES.length) {
          params.delete("categories");
        } else {
          params.set("categories", updated.join(","));
        }
      });
    },
    [updateParams]
  );

  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const setAllCategories = useCallback(
    (all: boolean) => {
      updateParams((params) => {
        params.delete("page");
        if (all) {
          params.delete("categories");
        } else {
          params.set("categories", "_");
        }
      });
    },
    [updateParams],
  );

  const applyQuickPick = useCallback(
    (pick: DateQuickPick) => {
      const today = new Date();
      let dateFrom: Date;
      let dateTo: Date;

      switch (pick) {
        case "this-week":
          dateFrom = startOfWeek(today, { weekStartsOn: 1 });
          dateTo = endOfWeek(today, { weekStartsOn: 1 });
          break;
        case "this-weekend": {
          const sat = isSaturday(today) ? today : nextSaturday(today);
          dateFrom = sat;
          dateTo = addDays(sat, 1); // Sunday
          break;
        }
        case "this-month":
          dateFrom = startOfMonth(today);
          dateTo = endOfMonth(today);
          break;
        case "next-30-days":
          dateFrom = today;
          dateTo = addDays(today, 30);
          break;
      }

      updateParams((params) => {
        params.delete("page");
        params.set("dateFrom", startOfDay(dateFrom).toISOString());
        params.set("dateTo", endOfDay(dateTo).toISOString());
      });
    },
    [updateParams]
  );

  return { ...filters, setFilter, toggleCategory, setAllCategories, resetFilters, applyQuickPick };
}
