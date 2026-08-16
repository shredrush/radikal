"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { checkUsernameAvailability } from "@/lib/actions/auth";

export type UsernameAvailability = Awaited<
  ReturnType<typeof checkUsernameAvailability>
>;

type Options = {
  /** Debounce delay before the availability request fires, in ms. */
  delay?: number;
  /**
   * Optionally short-circuit the check for a value that already belongs to the
   * signed-in user (their own handle reads as "taken" but should not hit the
   * endpoint).
   */
  isCurrentUsername?: (value: string) => boolean;
};

const DEFAULT_CURRENT_USERNAME_MESSAGE = "This is your current username.";

export function useUsernameAvailability(options: Options = {}) {
  const { delay = 500, isCurrentUsername } = options;

  const [availability, setAvailability] =
    useState<UsernameAvailability | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Invalidate any in-flight request and cancel the pending timer on unmount.
  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      clearTimer();
    };
  }, [clearTimer]);

  const check = useCallback(
    (value: string) => {
      clearTimer();
      const trimmed = value.trim().toLowerCase();

      if (!trimmed) {
        requestIdRef.current += 1;
        setIsChecking(false);
        setAvailability(null);
        return;
      }

      if (isCurrentUsername?.(trimmed)) {
        requestIdRef.current += 1;
        setIsChecking(false);
        setAvailability({
          status: "available",
          message: DEFAULT_CURRENT_USERNAME_MESSAGE,
        });
        return;
      }

      setIsChecking(false);
      setAvailability(null);

      const requestId = ++requestIdRef.current;
      timerRef.current = setTimeout(async () => {
        if (requestId !== requestIdRef.current) return;
        setIsChecking(true);
        try {
          const result = await checkUsernameAvailability(trimmed);
          if (requestId === requestIdRef.current) {
            setAvailability(result);
          }
        } finally {
          if (requestId === requestIdRef.current) {
            setIsChecking(false);
          }
        }
      }, delay);
    },
    [clearTimer, delay, isCurrentUsername]
  );

  return { availability, isChecking, check };
}
