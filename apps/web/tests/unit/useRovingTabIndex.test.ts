import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRovingTabIndex } from "@/hooks/useRovingTabIndex";

function makeKeyEvent(key: string): React.KeyboardEvent<HTMLElement> {
  return {
    key,
    preventDefault: () => {},
  } as React.KeyboardEvent<HTMLElement>;
}

describe("useRovingTabIndex", () => {
  it("initialises focusedIndex at 0", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 5 }));
    expect(result.current.focusedIndex).toBe(0);
  });

  it("getTabIndex returns 0 for focused item, -1 for others", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 3 }));
    expect(result.current.getTabIndex(0)).toBe(0);
    expect(result.current.getTabIndex(1)).toBe(-1);
    expect(result.current.getTabIndex(2)).toBe(-1);
  });

  it("ArrowDown moves focus forward", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 3 }));
    act(() => {
      result.current.onKeyDown(makeKeyEvent("ArrowDown"));
    });
    expect(result.current.focusedIndex).toBe(1);
  });

  it("ArrowDown wraps around from last to first", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 3 }));
    act(() => result.current.setFocusedIndex(2));
    act(() => result.current.onKeyDown(makeKeyEvent("ArrowDown")));
    expect(result.current.focusedIndex).toBe(0);
  });

  it("ArrowUp moves focus backward", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 3 }));
    act(() => result.current.setFocusedIndex(2));
    act(() => result.current.onKeyDown(makeKeyEvent("ArrowUp")));
    expect(result.current.focusedIndex).toBe(1);
  });

  it("ArrowUp wraps around from first to last", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 3 }));
    act(() => result.current.onKeyDown(makeKeyEvent("ArrowUp")));
    expect(result.current.focusedIndex).toBe(2);
  });

  it("Home moves focus to first item", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 5 }));
    act(() => result.current.setFocusedIndex(4));
    act(() => result.current.onKeyDown(makeKeyEvent("Home")));
    expect(result.current.focusedIndex).toBe(0);
  });

  it("End moves focus to last item", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 5 }));
    act(() => result.current.onKeyDown(makeKeyEvent("End")));
    expect(result.current.focusedIndex).toBe(4);
  });

  it("ArrowRight in treeMode calls onExpand", () => {
    const onExpand = vi.fn();
    const { result } = renderHook(() =>
      useRovingTabIndex({ count: 3, treeMode: true, onExpand }),
    );
    act(() => result.current.onKeyDown(makeKeyEvent("ArrowRight")));
    expect(onExpand).toHaveBeenCalledWith(0);
  });

  it("ArrowLeft in treeMode calls onCollapse", () => {
    const onCollapse = vi.fn();
    const { result } = renderHook(() =>
      useRovingTabIndex({ count: 3, treeMode: true, onCollapse }),
    );
    act(() => result.current.onKeyDown(makeKeyEvent("ArrowLeft")));
    expect(onCollapse).toHaveBeenCalledWith(0);
  });

  it("does nothing when count is 0", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 0 }));
    act(() => result.current.onKeyDown(makeKeyEvent("ArrowDown")));
    expect(result.current.focusedIndex).toBe(0);
    // getTabIndex returns -1 for all indices when count is 0
    expect(result.current.getTabIndex(0)).toBe(-1);
  });

  it("setFocusedIndex updates focus", () => {
    const { result } = renderHook(() => useRovingTabIndex({ count: 5 }));
    act(() => result.current.setFocusedIndex(3));
    expect(result.current.focusedIndex).toBe(3);
    expect(result.current.getTabIndex(3)).toBe(0);
    expect(result.current.getTabIndex(0)).toBe(-1);
  });
});
