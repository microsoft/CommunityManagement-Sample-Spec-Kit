"use client";

import { useState, useCallback, KeyboardEvent } from "react";

export interface RovingTabIndexOptions {
  /** Total number of items in the collection */
  count: number;
  /** Called when the focused item should be expanded (tree pattern) */
  onExpand?: (index: number) => void;
  /** Called when the focused item should be collapsed (tree pattern) */
  onCollapse?: (index: number) => void;
  /** If true, ArrowRight/Left expand/collapse instead of moving focus */
  treeMode?: boolean;
}

export interface RovingTabIndexResult {
  /** The currently focused index */
  focusedIndex: number;
  /** Set focus to a specific index */
  setFocusedIndex: (index: number) => void;
  /** Returns tabIndex for a given item index */
  getTabIndex: (index: number) => 0 | -1;
  /** onKeyDown handler to attach to the container or each item */
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Implements the ARIA APG roving tabindex pattern for keyboard navigation.
 * @see https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex
 */
export function useRovingTabIndex({
  count,
  onExpand,
  onCollapse,
  treeMode = false,
}: RovingTabIndexOptions): RovingTabIndexResult {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const getTabIndex = useCallback(
    (index: number): 0 | -1 => (count > 0 && index === focusedIndex ? 0 : -1),
    [count, focusedIndex],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (count === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % count);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + count) % count);
          break;
        }
        case "ArrowRight": {
          e.preventDefault();
          if (treeMode) {
            onExpand?.(focusedIndex);
          } else {
            setFocusedIndex((prev) => (prev + 1) % count);
          }
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (treeMode) {
            onCollapse?.(focusedIndex);
          } else {
            setFocusedIndex((prev) => (prev - 1 + count) % count);
          }
          break;
        }
        case "Home": {
          e.preventDefault();
          setFocusedIndex(0);
          break;
        }
        case "End": {
          e.preventDefault();
          setFocusedIndex(count - 1);
          break;
        }
        default:
          break;
      }
    },
    [count, focusedIndex, treeMode, onExpand, onCollapse],
  );

  return { focusedIndex, setFocusedIndex, getTabIndex, onKeyDown };
}

