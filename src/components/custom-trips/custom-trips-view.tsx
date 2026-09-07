"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Briefcase, ChevronDown, Compass, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CUSTOM_TRIP_DELETED_STYLE,
  CUSTOM_TRIP_GROUP_LABELS,
  CUSTOM_TRIP_STATUS_LABELS,
  CUSTOM_TRIP_STATUS_STYLES,
  formatCustomTripDateRange,
  type CustomTripRequestDetail,
  type CustomTripRequestBoardListItem,
} from "@/lib/custom-trips";
import { formatDateTime, formatMessageTime } from "@/lib/format";
import { CustomTripRequestDetailPanel } from "@/components/custom-trips/custom-trip-request-detail";
import { Badge } from "@/components/ui/badge";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

function preview(body: string | null) {
  if (!body) return "No messages yet";
  const singleLine = body.replace(/\s+/g, " ").trim();
  return singleLine.length > 64 ? `${singleLine.slice(0, 64)}…` : singleLine;
}

function listSignature(requests: CustomTripRequestBoardListItem[]) {
  return requests
    .map(
      (request) =>
        `${request.id}:${request.status}:${request.deletedAt ?? ""}:${request.updatedAt}:${request.lastMessageSenderId ?? ""}:${request.lastMessageBody ?? ""}`,
    )
    .join("|");
}

type DeferredSection = "confirmed" | "cancelled" | "deleted";
type RequestSection = DeferredSection | "open";

export function CustomTripsView({
  initialRequests,
  confirmedRequests: initialConfirmedRequests,
  confirmedRequestsCount,
  cancelledRequests: initialCancelledRequests,
  cancelledRequestsCount,
  deletedRequests: initialDeletedRequests,
  deletedRequestsCount,
  initialNextCursor = null,
  selectedRequestId,
  selectedRequest,
  onStatusChanged,
}: {
  initialRequests: CustomTripRequestBoardListItem[];
  confirmedRequests: CustomTripRequestBoardListItem[];
  confirmedRequestsCount: number;
  cancelledRequests: CustomTripRequestBoardListItem[];
  cancelledRequestsCount: number;
  deletedRequests: CustomTripRequestBoardListItem[];
  deletedRequestsCount: number;
  initialNextCursor?: string | null;
  selectedRequestId?: string;
  selectedRequest: CustomTripRequestDetail | null;
  onStatusChanged?: (previousStatus: string, nextStatus: string) => void;
}) {
  const [requests, setRequests] = useState<CustomTripRequestBoardListItem[]>(initialRequests);
  const [confirmedRequests, setConfirmedRequests] =
    useState<CustomTripRequestBoardListItem[]>(initialConfirmedRequests);
  const [cancelledRequests, setCancelledRequests] =
    useState<CustomTripRequestBoardListItem[]>(initialCancelledRequests);
  const [deletedRequests, setDeletedRequests] =
    useState<CustomTripRequestBoardListItem[]>(initialDeletedRequests);
  const [customRequestsOpen, setCustomRequestsOpen] = useState(true);
  const [confirmedOpen, setConfirmedOpen] = useState(false);
  const [cancelledOpen, setCancelledOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [confirmedLoaded, setConfirmedLoaded] = useState(initialConfirmedRequests.length > 0);
  const [cancelledLoaded, setCancelledLoaded] = useState(initialCancelledRequests.length > 0);
  const [deletedLoaded, setDeletedLoaded] = useState(initialDeletedRequests.length > 0);
  const [loadingSection, setLoadingSection] = useState<DeferredSection | null>(null);
  const [nextCursors, setNextCursors] = useState<Record<RequestSection, string | null>>({
    open: initialNextCursor,
    confirmed: null,
    cancelled: null,
    deleted: null,
  });
  const requestsFetchControllerRef = useRef<AbortController | null>(null);

  const loadRequests = useCallback(async (replaceActiveRequest = false, cursor?: string) => {
    if (requestsFetchControllerRef.current) {
      if (!replaceActiveRequest) return;
      requestsFetchControllerRef.current.abort();
    }

    const controller = new AbortController();
    requestsFetchControllerRef.current = controller;
    try {
      const params = new URLSearchParams({ section: "open" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/custom-trips/requests?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data.open)
        ? (data.open as CustomTripRequestBoardListItem[])
        : [];
      setRequests((previous) => {
        const merged = cursor ? [...previous, ...next.filter((item) => !previous.some(({ id }) => id === item.id))] : next;
        return listSignature(previous) === listSignature(merged) ? previous : merged;
      });
      setNextCursors((current) => ({ ...current, open: data.nextCursor ?? null }));
    } catch {
      // Ignore transient network errors; the next poll will retry.
    } finally {
      if (requestsFetchControllerRef.current === controller) {
        requestsFetchControllerRef.current = null;
      }
    }
  }, []);

  const loadSection = useCallback(async (section: DeferredSection, cursor?: string) => {
    setLoadingSection(section);
    try {
      const params = new URLSearchParams({ section });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/custom-trips/requests?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data[section])
        ? (data[section] as CustomTripRequestBoardListItem[])
        : [];

      if (section === "confirmed") {
        setConfirmedRequests((current) => cursor ? [...current, ...next.filter((item) => !current.some(({ id }) => id === item.id))] : next);
        setConfirmedLoaded(true);
      } else if (section === "cancelled") {
        setCancelledRequests((current) => cursor ? [...current, ...next.filter((item) => !current.some(({ id }) => id === item.id))] : next);
        setCancelledLoaded(true);
      } else {
        setDeletedRequests((current) => cursor ? [...current, ...next.filter((item) => !current.some(({ id }) => id === item.id))] : next);
        setDeletedLoaded(true);
      }
      setNextCursors((current) => ({ ...current, [section]: data.nextCursor ?? null }));
    } catch {
      // Leave the section eligible for a retry on its next expansion.
    } finally {
      setLoadingSection((current) => (current === section ? null : current));
    }
  }, []);

  useVisiblePolling(true, loadRequests, 15_000);

  useEffect(() => {
    return () => {
      requestsFetchControllerRef.current?.abort();
    };
  }, []);

  const newCount = requests.filter((request) => request.status === "NEW").length;
  const confirmedCount = confirmedLoaded ? confirmedRequests.length : confirmedRequestsCount;
  const cancelledCount = cancelledLoaded ? cancelledRequests.length : cancelledRequestsCount;
  const deletedCount = deletedLoaded ? deletedRequests.length : deletedRequestsCount;

  function toggleConfirmed() {
    const nextOpen = !confirmedOpen;
    setConfirmedOpen(nextOpen);
    if (nextOpen && !confirmedLoaded) void loadSection("confirmed");
  }

  function toggleCancelled() {
    const nextOpen = !cancelledOpen;
    setCancelledOpen(nextOpen);
    if (nextOpen && !cancelledLoaded) void loadSection("cancelled");
  }

  function toggleDeleted() {
    const nextOpen = !deletedOpen;
    setDeletedOpen(nextOpen);
    if (nextOpen && !deletedLoaded) void loadSection("deleted");
  }

  function handleRequestChanged() {
    void loadRequests(true);
    void loadSection("confirmed");
    void loadSection("cancelled");
    void loadSection("deleted");
  }

  function handleStatusChanged(previousStatus: string, nextStatus: string) {
    handleRequestChanged();
    onStatusChanged?.(previousStatus, nextStatus);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Request list */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Total requests</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {requests.length + confirmedCount + cancelledCount}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">New</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {newCount}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm text-muted-foreground">Confirmed</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {confirmedCount}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Cancelled</p>
            <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
              {cancelledCount}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setCustomRequestsOpen((open) => !open)}
            aria-expanded={customRequestsOpen}
            className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Open requests ({requests.length})
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                customRequestsOpen && "rotate-180",
              )}
            />
          </button>
          {customRequestsOpen ? (requests.length === 0 ? (
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
                      {formatMessageTime(request.updatedAt)}
                    </p>
                  </Link>
                );
              })}
              {nextCursors.open ? (
                <button
                  type="button"
                  onClick={() => void loadRequests(false, nextCursors.open ?? undefined)}
                  className="rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Load more
                </button>
              ) : null}
            </div>
          )) : null}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={toggleConfirmed}
            aria-expanded={confirmedOpen}
            className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Confirmed ({confirmedCount})
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                confirmedOpen && "rotate-180",
              )}
            />
          </button>
          {confirmedOpen ? (loadingSection === "confirmed" || !confirmedLoaded ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading confirmed custom trips...
            </div>
          ) : confirmedRequests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
              No confirmed custom trips yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {confirmedRequests.map((request) => {
                const isActive = request.id === selectedRequestId;

                return (
                  <Link
                    key={request.id}
                    href={`/support?tab=custom&request=${request.id}`}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border p-3 transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/5"
                        : "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <Briefcase className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {request.customer.name}
                        </span>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-widest",
                          CUSTOM_TRIP_STATUS_STYLES.CONFIRMED,
                        )}
                      >
                        Confirmed
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
                      {formatMessageTime(request.updatedAt)}
                    </p>
                  </Link>
                );
              })}
              {nextCursors.confirmed ? (
                <button
                  type="button"
                  onClick={() => void loadSection("confirmed", nextCursors.confirmed ?? undefined)}
                  className="rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Load more
                </button>
              ) : null}
            </div>
          )) : null}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={toggleCancelled}
            aria-expanded={cancelledOpen}
            className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Cancelled ({cancelledCount})
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                cancelledOpen && "rotate-180",
              )}
            />
          </button>
          {cancelledOpen ? (
            loadingSection === "cancelled" || !cancelledLoaded ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading cancelled custom trips...
              </div>
            ) : cancelledRequests.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                No cancelled custom trips yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
              {cancelledRequests.map((request) => {
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
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-rose-700 dark:text-rose-300">
                          <Briefcase className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {request.customer.name}
                        </span>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-widest",
                          "border-border/70 text-rose-600 dark:text-rose-400",
                        )}
                      >
                        Cancelled
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
                      {formatMessageTime(request.updatedAt)}
                    </p>
                  </Link>
                );
              })}
              {nextCursors.cancelled ? (
                <button
                  type="button"
                  onClick={() => void loadSection("cancelled", nextCursors.cancelled ?? undefined)}
                  className="rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Load more
                </button>
              ) : null}
              </div>
            )
          ) : null}
        </div>

        {deletedCount > 0 ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={toggleDeleted}
              aria-expanded={deletedOpen}
              className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Deleted ({deletedCount})
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  deletedOpen && "rotate-180",
                )}
              />
            </button>
            {deletedOpen ? (loadingSection === "deleted" || !deletedLoaded ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading deleted custom trips...
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {deletedRequests.map((request) => {
                  const isActive = request.id === selectedRequestId;

                  return (
                    <Link
                    key={request.id}
                    href={`/support?tab=custom&request=${request.id}`}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border border-dashed p-3 transition-colors",
                      isActive
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/70 bg-background/60 opacity-80 hover:border-border hover:bg-background",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground/70">
                          <Briefcase className="h-3.5 w-3.5" />
                        </span>
                        <span className="truncate text-sm font-medium text-muted-foreground">
                          {request.customer.name}
                        </span>
                      </div>
                      <Badge className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-widest", CUSTOM_TRIP_DELETED_STYLE)}>
                        Deleted
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
                      {request.deletedAt ? `Deleted ${formatDateTime(request.deletedAt)}` : "Deleted"}
                    </p>
                    </Link>
                  );
                })}
                {nextCursors.deleted ? (
                  <button
                    type="button"
                    onClick={() => void loadSection("deleted", nextCursors.deleted ?? undefined)}
                    className="rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Load more
                  </button>
                ) : null}
              </div>
            )) : null}
          </div>
        ) : null}
      </aside>

      {/* Request detail */}
      <section className="min-w-0">
        {selectedRequest ? (
          <CustomTripRequestDetailPanel
            request={selectedRequest}
            onRequestChanged={handleRequestChanged}
            onStatusChanged={handleStatusChanged}
          />
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
