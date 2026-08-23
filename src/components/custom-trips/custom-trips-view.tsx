"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Briefcase, Compass } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CUSTOM_TRIP_GROUP_LABELS,
  CUSTOM_TRIP_STATUS_LABELS,
  CUSTOM_TRIP_STATUS_STYLES,
  formatCustomTripDateRange,
  formatCustomTripMessageTime,
  type CustomTripRequestDetail,
  type CustomTripRequestListItem,
} from "@/lib/custom-trips";
import { CustomTripRequestDetailPanel } from "@/components/custom-trips/custom-trip-request-detail";
import { Badge } from "@/components/ui/badge";

function preview(body: string | null) {
  if (!body) return "No messages yet";
  const singleLine = body.replace(/\s+/g, " ").trim();
  return singleLine.length > 64 ? `${singleLine.slice(0, 64)}…` : singleLine;
}

function listSignature(requests: CustomTripRequestListItem[]) {
  return requests
    .map(
      (request) =>
        `${request.id}:${request.status}:${request.updatedAt}:${request.lastMessageSenderId ?? ""}:${request.lastMessageBody ?? ""}`,
    )
    .join("|");
}

export function CustomTripsView({
  initialRequests,
  selectedRequestId,
  selectedRequest,
}: {
  initialRequests: CustomTripRequestListItem[];
  selectedRequestId?: string;
  selectedRequest: CustomTripRequestDetail | null;
}) {
  const [requests, setRequests] = useState<CustomTripRequestListItem[]>(initialRequests);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/custom-trips/requests", { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data.requests)
        ? (data.requests as CustomTripRequestListItem[])
        : [];
      setRequests((previous) => (listSignature(previous) === listSignature(next) ? previous : next));
    } catch {
      // Ignore transient network errors; the next poll will retry.
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(loadRequests, 3000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  const newCount = requests.filter((request) => request.status === "NEW").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Request list */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Total requests</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {requests.length}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">New</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {newCount}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Custom trip requests
          </h2>
          {requests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
              No custom trip requests yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {requests.map((request) => {
                const isActive = request.id === selectedRequestId;

                return (
                  <Link
                    key={request.id}
                    href={`/support?tab=custom&request=${request.id}`}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-3 transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/70 bg-background/60 hover:border-border hover:bg-background",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Briefcase className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {request.customer.name}
                        </span>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-widest",
                          CUSTOM_TRIP_STATUS_STYLES[request.status] ?? CUSTOM_TRIP_STATUS_STYLES.NEW,
                        )}
                      >
                        {CUSTOM_TRIP_STATUS_LABELS[request.status] ?? request.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {CUSTOM_TRIP_GROUP_LABELS[request.groupType] ?? request.groupType} ·{" "}
                      {formatCustomTripDateRange(request.startDate, request.endDate)}
                    </p>
                    <p className="min-w-0 truncate text-xs text-muted-foreground">
                      {preview(request.lastMessageBody)}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground/70">
                      {formatCustomTripMessageTime(request.updatedAt)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Request detail */}
      <section className="min-w-0">
        {selectedRequest ? (
          <CustomTripRequestDetailPanel request={selectedRequest} />
        ) : (
          <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
            <Compass className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">Select a custom trip request</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a request from the list to review the requirements and chat with the
                traveller.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
