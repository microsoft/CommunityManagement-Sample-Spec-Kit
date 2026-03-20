import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/events/explorer",
}));

// Import after mocks are set up
const { useExplorerFilters } = await import("@/hooks/useExplorerFilters");
import { renderHook, act } from "@testing-library/react";

describe("useExplorerFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset search params
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
  });

  it("returns default filter state", () => {
    const { result } = renderHook(() => useExplorerFilters());
    expect(result.current.categories).toEqual([
      "jam", "workshop", "class", "festival", "social", "retreat", "teacher_training",
    ]);
    expect(result.current.location).toBeNull();
    expect(result.current.view).toBe("month");
    expect(result.current.page).toBe(1);
  });

  it("parses URL params into filter state", () => {
    mockSearchParams.set("categories", "jam,workshop");
    mockSearchParams.set("view", "week");
    mockSearchParams.set("location", "bristol");
    mockSearchParams.set("page", "3");

    const { result } = renderHook(() => useExplorerFilters());
    expect(result.current.categories).toEqual(["jam", "workshop"]);
    expect(result.current.view).toBe("week");
    expect(result.current.location).toBe("bristol");
    expect(result.current.page).toBe(3);
  });

  it("falls back to month for invalid view", () => {
    mockSearchParams.set("view", "invalid");
    const { result } = renderHook(() => useExplorerFilters());
    expect(result.current.view).toBe("month");
  });

  it("setFilter calls router.push with updated params", () => {
    const { result } = renderHook(() => useExplorerFilters());
    act(() => {
      result.current.setFilter("view", "week");
    });
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("view=week"),
      expect.any(Object)
    );
  });

  it("setFilter resets page when changing non-page filters", () => {
    mockSearchParams.set("page", "5");
    const { result } = renderHook(() => useExplorerFilters());
    act(() => {
      result.current.setFilter("location", "bristol");
    });
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("page=");
  });

  it("toggleCategory toggles a category on", () => {
    mockSearchParams.set("categories", "jam");
    const { result } = renderHook(() => useExplorerFilters());
    act(() => {
      result.current.toggleCategory("workshop");
    });
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("workshop");
    expect(calledUrl).toContain("jam");
  });

  it("toggleCategory toggles a category off", () => {
    mockSearchParams.set("categories", "jam,workshop");
    const { result } = renderHook(() => useExplorerFilters());
    act(() => {
      result.current.toggleCategory("jam");
    });
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("workshop");
    expect(calledUrl).not.toContain("categories=jam%2C");
    expect(calledUrl).not.toContain("categories=jam&");
  });

  it("resetFilters clears all params", () => {
    mockSearchParams.set("categories", "jam");
    mockSearchParams.set("view", "week");
    const { result } = renderHook(() => useExplorerFilters());
    act(() => {
      result.current.resetFilters();
    });
    expect(mockPush).toHaveBeenCalledWith("/events/explorer", expect.any(Object));
  });

  it("applyQuickPick sets dateFrom and dateTo", () => {
    const { result } = renderHook(() => useExplorerFilters());
    act(() => {
      result.current.applyQuickPick("this-month");
    });
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("dateFrom=");
    expect(calledUrl).toContain("dateTo=");
  });
});
