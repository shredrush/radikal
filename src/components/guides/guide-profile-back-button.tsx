"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

const subscribeToHistory = () => () => {};

function hasPreviousHistoryEntry() {
  return window.history.length > 1;
}

export function GuideProfileBackButton() {
  const router = useRouter();
  // A newly opened tab has no in-tab entry to return to.
  const canGoBack = useSyncExternalStore(subscribeToHistory, hasPreviousHistoryEntry, () => false);

  if (!canGoBack) return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      back
    </button>
  );
}
