"use client";

import { useEffect, useState } from "react";

const DEFAULT_INTERVAL = 500;

/**
 * Cycles an animated ellipsis through the end of a placeholder while the input
 * is empty, revealing one dot at a time and repeating.
 */
export function useEllipsisPlaceholder(
  base: string,
  isActive: boolean,
  interval = DEFAULT_INTERVAL
) {
  const [visibleDots, setVisibleDots] = useState(0);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const id = setInterval(() => {
      setVisibleDots((current) => (current + 1) % 4);
    }, interval);

    return () => clearInterval(id);
  }, [isActive, interval]);

  if (!isActive) {
    return base;
  }

  return `${base}${".".repeat(visibleDots)}`;
}
