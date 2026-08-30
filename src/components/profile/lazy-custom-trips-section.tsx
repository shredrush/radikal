"use client";

import { useCallback, useState } from "react";
import { ChevronDown, Compass, Loader2 } from "lucide-react";

import {
  CustomTripRequestCard,
  CustomTripRequestEmpty,
} from "@/components/custom-trips/custom-trip-request-card";
import type { CustomTripRequestListItem } from "@/lib/custom-trips";
import { cn } from "@/lib/utils";

export function LazyCustomTripsSection() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<CustomTripRequestListItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(false);
    try {
      const url = new URL("/api/profile/custom-trips", window.location.origin);
      if (cursor) url.searchParams.set("cursor", cursor);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Request failed");
      const data = (await response.json()) as {
        requests?: CustomTripRequestListItem[];
        nextCursor?: string | null;
      };
      const nextRequests = Array.isArray(data.requests) ? data.requests : [];
      setRequests((current) => (cursor && current ? [...current, ...nextRequests] : nextRequests));
      setNextCursor(data.nextCursor ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (requests === null && !loading) {
      void load();
    }
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left transition-colors hover:bg-muted/40 sm:px-8"
      >
        <span className="flex flex-col gap-1.5">
          <span className="font-heading text-lg font-semibold uppercase tracking-wider text-foreground">
            Custom trips
          </span>
          <span className="text-sm leading-relaxed text-muted-foreground">
            Private group and corporate trips you&apos;ve requested on your own dates.
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="px-6 pb-6 sm:px-8">
          {loading && requests === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <div className="rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              Couldn&apos;t load custom trips. Please try again.
            </div>
          ) : requests && requests.length === 0 ? (
            <CustomTripRequestEmpty />
          ) : requests ? (
            <>
              <ul className="flex flex-col gap-3">
                {requests.map((request) => (
                  <li key={request.id}>
                    <CustomTripRequestCard request={request} />
                  </li>
                ))}
              </ul>
              {nextCursor ? (
                <button
                  type="button"
                  onClick={() => void load(nextCursor)}
                  className="mt-4 w-full rounded-full border border-border/80 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </span>
                  ) : (
                    "Load more"
                  )}
                </button>
              ) : null}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
              <Compass className="h-8 w-8 text-muted-foreground/50" />
              <p className="font-medium text-foreground">Open to load custom trips</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
