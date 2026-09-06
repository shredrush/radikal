"use client";

import { useEffect } from "react";

export function useVisiblePolling(
  enabled: boolean,
  poll: () => void | Promise<void>,
  intervalMs: number,
) {
  useEffect(() => {
    if (!enabled) return;

    let interval: ReturnType<typeof setInterval> | undefined;

    function stopPolling() {
      if (interval) clearInterval(interval);
      interval = undefined;
    }

    function startPolling() {
      if (document.visibilityState !== "visible") return;
      interval = setInterval(() => void poll(), intervalMs);
    }

    function handleVisibilityChange() {
      stopPolling();
      if (document.visibilityState === "visible") {
        void poll();
        startPolling();
      }
    }

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, intervalMs, poll]);
}
