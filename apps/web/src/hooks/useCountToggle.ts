"use client";

import { useState, useCallback } from "react";

/**
 * Toggle boolean state persisted to localStorage.
 * Returns [value, toggle] — similar to useReducer for a boolean.
 */
export function useCountToggle(key: string, defaultValue = true): [boolean, () => void] {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? stored === "true" : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const toggle = useCallback(() => {
    setValue((prev) => {
      const next = !prev;
      try { localStorage.setItem(key, String(next)); } catch { /* quota */ }
      return next;
    });
  }, [key]);

  return [value, toggle];
}
