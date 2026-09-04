"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Compass, MessageSquare, Ticket, User, type LucideIcon } from "lucide-react";

import { isAwaitingReply, type SupportChatListItem, type SupportMessageView } from "@/lib/support";
import { formatMessageTime } from "@/lib/format";
import type {
  CustomTripRequestDetail,
  CustomTripRequestListItem,
} from "@/lib/custom-trips";
import type { BookingBoardItem } from "@/lib/bookings";
import { SupportReplyPanel } from "@/components/support/support-reply-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminGuideFilter } from "@/components/admin/admin-guide-filter";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/trip-metadata";

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

function chatListSignature(chats: SupportChatListItem[]) {
  return chats
    .map(
      (chat) =>
        `${chat.id}:${chat.status}:${chat.deletedAt ?? ""}:${chat.lastMessageSenderId ?? ""}:${chat.lastMessageBody ?? ""}:${chat.updatedAt}`,
    )
    .join("|");
}

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
  initialResolvedChats,
  pendingConversationsCount,
  initialBookings,
  bookingGuides,
  selectedBookingGuideId,
  selectedBookingType,
  pendingBookingsCount,
  initialCustomRequests,
  deletedCustomRequests,
  newCustomRequestsCount,
  chatId,
  tab,
  selectedChat,
  selectedCustomRequestId,
  selectedCustomRequest,
}: {
  initialChats: SupportChatListItem[];
  initialResolvedChats: SupportChatListItem[];
  pendingConversationsCount: number;
  initialBookings: BookingBoardItem[];
  bookingGuides: Array<{ id: string; name: string }>;
  selectedBookingGuideId: string;
  selectedBookingType: string;
  pendingBookingsCount: number;
  initialCustomRequests: CustomTripRequestListItem[];
  deletedCustomRequests: CustomTripRequestListItem[];
  newCustomRequestsCount: number;
  chatId?: string;
  tab: SupportBoardTab;
  selectedChat: SupportBoardSelectedChat | null;
  selectedCustomRequestId?: string;
  selectedCustomRequest: CustomTripRequestDetail | null;
}) {
  const [chats, setChats] = useState<SupportChatListItem[]>(initialChats);
  const [resolvedChats, setResolvedChats] =
    useState<SupportChatListItem[]>(initialResolvedChats);

  const loadChats = useCallback(async () => {
    try {
      const response = await fetch("/api/support/chats", { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data.chats) ? (data.chats as SupportChatListItem[]) : [];
      const nextResolved = Array.isArray(data.resolved)
        ? (data.resolved as SupportChatListItem[])
        : [];
      setChats((previous) => (chatListSignature(previous) === chatListSignature(next) ? previous : next));
      setResolvedChats((previous) =>
        chatListSignature(previous) === chatListSignature(nextResolved) ? previous : nextResolved,
      );
    } catch {
      // Ignore transient network errors; the next poll will retry.
    }
  }, []);

  useEffect(() => {
    if (tab !== "conversations") return;
    const interval = setInterval(loadChats, 3000);
    return () => clearInterval(interval);
  }, [loadChats, tab]);

  const openChats = chats.filter((chat) => chat.status === "OPEN");
  const closedChats = chats.filter((chat) => chat.status === "CLOSED");
  const resolvedByCustomer = resolvedChats.length;

  // On the conversations tab the count stays live with the 3s poll; on the
  // other tabs the full chat list is never loaded, so use the server-computed
  // count passed down instead.
  const awaitingReplyCount =
    tab === "conversations"
      ? openChats.filter(isAwaitingReply).length
      : pendingConversationsCount;

  const tabCounts: Record<SupportBoardTab, number> = {
    conversations: awaitingReplyCount,
    bookings: pendingBookingsCount,
    custom: newCustomRequestsCount,
  };

  function renderChatItem(chat: SupportChatListItem, isActive: boolean, resolvedAt?: string | null) {
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
            <StatCard label="Closed" value={closedChats.length} />
            <StatCard label="Resolved" value={resolvedByCustomer} />
          </section>
        ) : tab === "bookings" ? (
          <BookingsStats items={initialBookings} />
        ) : (
          <section className="grid gap-3 md:grid-cols-2">
            <StatCard label="Total requests" value={initialCustomRequests.length} />
            <StatCard label="New" value={newCustomRequestsCount} />
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
              deletedRequests={deletedCustomRequests}
              selectedRequestId={selectedCustomRequestId}
              selectedRequest={selectedCustomRequest}
            />
          </section>
        ) : (
          <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              {/* Conversation list */}
              <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
                <div className="space-y-2">
                  <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Open
                  </h2>
                  {openChats.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                      No open conversations.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {openChats.map((chat) => renderChatItem(chat, chat.id === chatId))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Closed
                  </h2>
                  {closedChats.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                      No closed conversations.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {closedChats.map((chat) => renderChatItem(chat, chat.id === chatId))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Resolved
                  </h2>
                  {resolvedChats.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                      No resolved conversations.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {resolvedChats.map((chat) =>
                        renderChatItem(chat, chat.id === chatId, chat.deletedAt),
                      )}
                    </div>
                  )}
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
