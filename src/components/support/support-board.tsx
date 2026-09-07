"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Compass, Loader2, MessageSquare, Ticket, User, type LucideIcon } from "lucide-react";

import {
  isAwaitingReply,
  type SupportChatBoardListItem,
  type SupportMessageView,
} from "@/lib/support";
import { formatMessageTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  CustomTripRequestDetail,
  CustomTripRequestBoardListItem,
} from "@/lib/custom-trips";
import type { BookingBoardItem } from "@/lib/bookings";
import { SupportReplyPanel } from "@/components/support/support-reply-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminGuideFilter } from "@/components/admin/admin-guide-filter";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/trip-metadata";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

const BookingsStats = dynamic(
  () => import("@/components/bookings/bookings-stats").then((module) => module.BookingsStats),
  { loading: () => null },
);
const BookingsBoard = dynamic(
  () => import("@/components/bookings/bookings-board").then((module) => module.BookingsBoard),
  {
    loading: () => (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading bookings…</p>
    ),
  },
);
const CustomTripsView = dynamic(
  () => import("@/components/custom-trips/custom-trips-view").then((module) => module.CustomTripsView),
  {
    loading: () => (
      <p className="py-8 text-center text-sm text-muted-foreground">Loading custom trips…</p>
    ),
  },
);

export type SupportBoardSelectedChat = {
  id: string;
  status: "OPEN" | "CLOSED";
  deletedAt: string | null;
  customerName: string;
  customerEmail: string;
  messages: SupportMessageView[];
};

export type SupportBoardTab = "conversations" | "bookings" | "custom";

const TABS: { key: SupportBoardTab; href: string; label: string; icon: LucideIcon }[] = [
  { key: "conversations", href: "/support", label: "Conversations", icon: MessageSquare },
  { key: "custom", href: "/support?tab=custom", label: "Custom trips", icon: Compass },
  { key: "bookings", href: "/support?tab=bookings", label: "Bookings", icon: Ticket },
];

const TAB_META: Record<SupportBoardTab, { title: string; description: string }> = {
  conversations: {
    title: "Conversations",
    description: "Read and reply to traveller support conversations.",
  },
  bookings: {
    title: "Manage Bookings",
    description: "A live view of every booking on the platform.",
  },
  custom: {
    title: "Custom Trips",
    description: "Review custom trip requests and chat with travellers.",
  },
};

function preview(body: string | null) {
  if (!body) return "No messages yet";
  const singleLine = body.replace(/\s+/g, " ").trim();
  return singleLine.length > 64 ? `${singleLine.slice(0, 64)}…` : singleLine;
}

function chatListSignature(chats: SupportChatBoardListItem[]) {
  return chats
    .map(
      (chat) =>
        `${chat.id}:${chat.status}:${chat.deletedAt ?? ""}:${chat.lastMessageSenderId ?? ""}:${chat.lastMessageBody ?? ""}:${chat.updatedAt}`,
    )
    .join("|");
}

type DeferredChatSection = "closed" | "resolved";
type ChatSection = DeferredChatSection | "open";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function SupportBoard({
  initialChats,
  initialChatsNextCursor,
  initialClosedChats,
  closedChatsCount,
  initialResolvedChats,
  resolvedChatsCount,
  pendingConversationsCount,
  initialBookings,
  bookingGuides,
  selectedBookingGuideId,
  selectedBookingType,
  pendingBookingsCount,
  initialCustomRequests,
  initialNextCursor,
  confirmedCustomRequests,
  confirmedCustomRequestsCount,
  cancelledCustomRequests,
  cancelledCustomRequestsCount,
  deletedCustomRequests,
  deletedCustomRequestsCount,
  newCustomRequestsCount,
  chatId,
  tab,
  selectedChat,
  selectedCustomRequestId,
  selectedCustomRequest,
}: {
  initialChats: SupportChatBoardListItem[];
  initialChatsNextCursor: string | null;
  initialClosedChats: SupportChatBoardListItem[];
  closedChatsCount: number;
  initialResolvedChats: SupportChatBoardListItem[];
  resolvedChatsCount: number;
  pendingConversationsCount: number;
  initialBookings: BookingBoardItem[];
  bookingGuides: Array<{ id: string; name: string }>;
  selectedBookingGuideId: string;
  selectedBookingType: string;
  pendingBookingsCount: number;
  initialCustomRequests: CustomTripRequestBoardListItem[];
  initialNextCursor: string | null;
  confirmedCustomRequests: CustomTripRequestBoardListItem[];
  confirmedCustomRequestsCount: number;
  cancelledCustomRequests: CustomTripRequestBoardListItem[];
  cancelledCustomRequestsCount: number;
  deletedCustomRequests: CustomTripRequestBoardListItem[];
  deletedCustomRequestsCount: number;
  newCustomRequestsCount: number;
  chatId?: string;
  tab: SupportBoardTab;
  selectedChat: SupportBoardSelectedChat | null;
  selectedCustomRequestId?: string;
  selectedCustomRequest: CustomTripRequestDetail | null;
}) {
  const [chats, setChats] = useState<SupportChatBoardListItem[]>(initialChats);
  const [closedChats, setClosedChats] = useState<SupportChatBoardListItem[]>(initialClosedChats);
  const [resolvedChats, setResolvedChats] =
    useState<SupportChatBoardListItem[]>(initialResolvedChats);
  const [customNewCount, setCustomNewCount] = useState(newCustomRequestsCount);
  const [openChatsOpen, setOpenChatsOpen] = useState(true);
  const [closedChatsOpen, setClosedChatsOpen] = useState(false);
  const [resolvedChatsOpen, setResolvedChatsOpen] = useState(false);
  const [closedChatsLoaded, setClosedChatsLoaded] = useState(initialClosedChats.length > 0);
  const [resolvedChatsLoaded, setResolvedChatsLoaded] = useState(initialResolvedChats.length > 0);
  const [loadingChatSection, setLoadingChatSection] = useState<DeferredChatSection | null>(null);
  const [nextChatCursors, setNextChatCursors] = useState<Record<ChatSection, string | null>>({
    open: initialChatsNextCursor,
    closed: null,
    resolved: null,
  });
  const chatsFetchControllerRef = useRef<AbortController | null>(null);

  const loadChats = useCallback(async (replaceActiveRequest = false, cursor?: string) => {
    if (chatsFetchControllerRef.current) {
      if (!replaceActiveRequest) return;
      chatsFetchControllerRef.current.abort();
    }

    const controller = new AbortController();
    chatsFetchControllerRef.current = controller;
    try {
      const params = new URLSearchParams({ section: "open" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/support/chats?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data.open) ? (data.open as SupportChatBoardListItem[]) : [];
      setChats((previous) => {
        const merged = cursor ? [...previous, ...next.filter((item) => !previous.some(({ id }) => id === item.id))] : next;
        return chatListSignature(previous) === chatListSignature(merged) ? previous : merged;
      });
      setNextChatCursors((current) => ({ ...current, open: data.nextCursor ?? null }));
    } catch {
      // Ignore transient network errors; the next poll will retry.
    } finally {
      if (chatsFetchControllerRef.current === controller) {
        chatsFetchControllerRef.current = null;
      }
    }
  }, []);

  const loadChatSection = useCallback(async (section: DeferredChatSection, cursor?: string) => {
    setLoadingChatSection(section);
    try {
      const params = new URLSearchParams({ section });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/support/chats?${params}`, { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data[section]) ? (data[section] as SupportChatBoardListItem[]) : [];
      if (section === "closed") {
        setClosedChats((current) => cursor ? [...current, ...next.filter((item) => !current.some(({ id }) => id === item.id))] : next);
        setClosedChatsLoaded(true);
      } else {
        setResolvedChats((current) => cursor ? [...current, ...next.filter((item) => !current.some(({ id }) => id === item.id))] : next);
        setResolvedChatsLoaded(true);
      }
      setNextChatCursors((current) => ({ ...current, [section]: data.nextCursor ?? null }));
    } catch {
      // Leave the section eligible for a retry on its next expansion.
    } finally {
      setLoadingChatSection((current) => (current === section ? null : current));
    }
  }, []);

  useVisiblePolling(tab === "conversations", loadChats, 15_000);

  useEffect(() => {
    return () => {
      chatsFetchControllerRef.current?.abort();
    };
  }, []);

  const openChats = chats.filter((chat) => chat.status === "OPEN");
  const closedCount = closedChatsLoaded ? closedChats.length : closedChatsCount;
  const resolvedCount = resolvedChatsLoaded ? resolvedChats.length : resolvedChatsCount;

  // On the conversations tab the count stays live with polling; on the
  // other tabs the full chat list is never loaded, so use the server-computed
  // count passed down instead.
  const awaitingReplyCount =
    tab === "conversations"
      ? openChats.filter(isAwaitingReply).length
      : pendingConversationsCount;

  const tabCounts: Record<SupportBoardTab, number> = {
    conversations: awaitingReplyCount,
    bookings: pendingBookingsCount,
    custom: customNewCount,
  };

  function toggleClosedChats() {
    const nextOpen = !closedChatsOpen;
    setClosedChatsOpen(nextOpen);
    if (nextOpen && !closedChatsLoaded) void loadChatSection("closed");
  }

  function toggleResolvedChats() {
    const nextOpen = !resolvedChatsOpen;
    setResolvedChatsOpen(nextOpen);
    if (nextOpen && !resolvedChatsLoaded) void loadChatSection("resolved");
  }

  function handleConversationChanged() {
    void loadChats(true);
    void loadChatSection("closed");
    void loadChatSection("resolved");
  }

  function handleCustomTripStatusChanged(previousStatus: string, nextStatus: string) {
    if (previousStatus === "NEW" && nextStatus !== "NEW") {
      setCustomNewCount((count) => Math.max(0, count - 1));
    } else if (previousStatus !== "NEW" && nextStatus === "NEW") {
      setCustomNewCount((count) => count + 1);
    }
  }

  function renderChatItem(chat: SupportChatBoardListItem, isActive: boolean, resolvedAt?: string | null) {
    const awaitingReply = isAwaitingReply(chat);
    const isClosed = chat.status === "CLOSED" && !resolvedAt;

    return (
      <Link
        key={chat.id}
        href={`/support?chat=${chat.id}`}
        className={`flex flex-col gap-1.5 rounded-xl border p-3 transition-colors ${
          isActive
            ? "border-primary/30 bg-primary/5"
            : resolvedAt
              ? "border-dashed border-border/70 bg-background/60 opacity-80 hover:border-border hover:bg-background"
              : "border-border/70 bg-background/60 hover:border-border hover:bg-background"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className={`truncate text-sm font-medium ${resolvedAt ? "text-muted-foreground" : "text-foreground"}`}>
              {chat.userName}
            </span>
          </div>
          <span className="shrink-0 text-[0.65rem] text-muted-foreground">
            {resolvedAt ? `Resolved ${formatMessageTime(resolvedAt)}` : formatMessageTime(chat.updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {preview(chat.lastMessageBody)}
          </p>
          {resolvedAt ? (
            <Badge className="shrink-0 rounded-full border border-muted-foreground/40 bg-muted-foreground/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Resolved
            </Badge>
          ) : isClosed ? (
            <Badge className="shrink-0 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              Closed
            </Badge>
          ) : awaitingReply ? (
            <Badge className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              Awaiting reply
            </Badge>
          ) : null}
        </div>
      </Link>
    );
  }

  const meta = TAB_META[tab];

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <header className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              back to profile
            </Link>
          </div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                Support board
              </p>
              <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
                {meta.title}
              </h1>
              <p className="text-sm leading-7 text-muted-foreground">{meta.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {TABS.map((item) => (
                <Button
                  key={item.key}
                  variant={tab === item.key ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  nativeButton={false}
                  render={<Link href={item.href} />}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                  {tabCounts[item.key] > 0 ? (
                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[0.65rem] font-bold leading-none text-white">
                      {tabCounts[item.key] > 9 ? "9+" : tabCounts[item.key]}
                    </span>
                  ) : null}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {tab === "conversations" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Awaiting reply" value={awaitingReplyCount} />
            <StatCard label="Open chats" value={openChats.length} />
            <StatCard label="Closed" value={closedCount} />
            <StatCard label="Resolved" value={resolvedCount} />
          </section>
        ) : tab === "bookings" ? (
          <BookingsStats items={initialBookings} />
        ) : (
          <section className="grid gap-3 md:grid-cols-2">
            <StatCard label="Total requests" value={initialCustomRequests.length} />
            <StatCard label="New" value={customNewCount} />
          </section>
        )}

        {tab === "bookings" ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <AdminGuideFilter
                guides={bookingGuides}
                selectedGuideId={selectedBookingGuideId}
                type={selectedBookingType || undefined}
                pathname="/support"
                params={{ tab: "bookings" }}
              />

              <div className="flex flex-nowrap gap-1.5 overflow-x-auto">
                <Button
                  variant={selectedBookingType === "" ? "default" : "outline"}
                  size="xs"
                  className="rounded-full border-2 border-black dark:border-white"
                  nativeButton={false}
                  render={<Link href={selectedBookingGuideId ? `/support?tab=bookings&guide=${selectedBookingGuideId}` : "/support?tab=bookings"} />}
                >
                  All
                </Button>
                {ACTIVITY_TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedBookingType === option.value ? "default" : "outline"}
                    size="xs"
                    className="rounded-full border-2 border-black dark:border-white"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/support?${new URLSearchParams({
                          tab: "bookings",
                          ...(selectedBookingGuideId ? { guide: selectedBookingGuideId } : {}),
                          type: option.value,
                        }).toString()}`}
                      />
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
              <BookingsBoard items={initialBookings} />
            </section>
          </>
        ) : tab === "custom" ? (
          <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
            <CustomTripsView
              initialRequests={initialCustomRequests}
              initialNextCursor={initialNextCursor}
              confirmedRequests={confirmedCustomRequests}
              confirmedRequestsCount={confirmedCustomRequestsCount}
              cancelledRequests={cancelledCustomRequests}
              cancelledRequestsCount={cancelledCustomRequestsCount}
              deletedRequests={deletedCustomRequests}
              deletedRequestsCount={deletedCustomRequestsCount}
              selectedRequestId={selectedCustomRequestId}
              selectedRequest={selectedCustomRequest}
              onStatusChanged={handleCustomTripStatusChanged}
            />
          </section>
        ) : (
          <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              {/* Conversation list */}
              <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setOpenChatsOpen((open) => !open)}
                    aria-expanded={openChatsOpen}
                    className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Open ({openChats.length})
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        openChatsOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {openChatsOpen ? (openChats.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                      No open conversations.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {openChats.map((chat) => renderChatItem(chat, chat.id === chatId))}
                      {nextChatCursors.open ? (
                        <button
                          type="button"
                          onClick={() => void loadChats(false, nextChatCursors.open ?? undefined)}
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
                    onClick={toggleClosedChats}
                    aria-expanded={closedChatsOpen}
                    className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Closed ({closedCount})
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        closedChatsOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {closedChatsOpen ? (loadingChatSection === "closed" || !closedChatsLoaded ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading closed conversations...
                    </div>
                  ) : closedChats.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                      No closed conversations.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {closedChats.map((chat) => renderChatItem(chat, chat.id === chatId))}
                      {nextChatCursors.closed ? (
                        <button
                          type="button"
                          onClick={() => void loadChatSection("closed", nextChatCursors.closed ?? undefined)}
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
                    onClick={toggleResolvedChats}
                    aria-expanded={resolvedChatsOpen}
                    className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Resolved ({resolvedCount})
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        resolvedChatsOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {resolvedChatsOpen ? (loadingChatSection === "resolved" || !resolvedChatsLoaded ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading resolved conversations...
                    </div>
                  ) : resolvedChats.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                      No resolved conversations.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {resolvedChats.map((chat) =>
                        renderChatItem(chat, chat.id === chatId, chat.deletedAt),
                      )}
                      {nextChatCursors.resolved ? (
                        <button
                          type="button"
                          onClick={() => void loadChatSection("resolved", nextChatCursors.resolved ?? undefined)}
                          className="rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                          Load more
                        </button>
                      ) : null}
                    </div>
                  )) : null}
                </div>
              </aside>

              {/* Conversation detail */}
              <section className="min-w-0">
                {selectedChat ? (
                  <SupportReplyPanel
                    chatId={selectedChat.id}
                    status={selectedChat.status}
                    resolvedAt={selectedChat.deletedAt}
                    customerName={selectedChat.customerName}
                    customerEmail={selectedChat.customerEmail}
                    messages={selectedChat.messages}
                    onConversationChanged={handleConversationChanged}
                  />
                ) : (
                  <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                    <div>
                      <p className="font-medium text-foreground">Select a conversation</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Choose an open chat from the list to read the thread and reply.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
