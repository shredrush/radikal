"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Ticket, User } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatSupportMessageTime,
  type SupportBookingListItem,
  type SupportChatListItem,
  type SupportMessageView,
} from "@/lib/support";
import { SupportReplyPanel } from "@/components/support/support-reply-panel";
import { SupportBookingsView } from "@/components/support/bookings-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type SupportDashboardSelectedChat = {
  id: string;
  status: "OPEN" | "CLOSED";
  customerName: string;
  customerEmail: string;
  messages: SupportMessageView[];
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
        `${chat.id}:${chat.status}:${chat.lastMessageSenderId ?? ""}:${chat.lastMessageBody ?? ""}:${chat.updatedAt}`,
    )
    .join("|");
}

export function SupportDashboard({
  initialChats,
  initialBookings,
  chatId,
  tab,
  selectedChat,
}: {
  initialChats: SupportChatListItem[];
  initialBookings: SupportBookingListItem[];
  chatId?: string;
  tab: "conversations" | "bookings";
  selectedChat: SupportDashboardSelectedChat | null;
}) {
  const [chats, setChats] = useState<SupportChatListItem[]>(initialChats);

  const loadChats = useCallback(async () => {
    try {
      const response = await fetch("/api/support/chats", { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data.chats) ? (data.chats as SupportChatListItem[]) : [];
      setChats((previous) => (chatListSignature(previous) === chatListSignature(next) ? previous : next));
    } catch {
      // Ignore transient network errors; the next poll will retry.
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(loadChats, 3000);
    return () => clearInterval(interval);
  }, [loadChats]);

  const openChats = chats.filter((chat) => chat.status === "OPEN");
  const closedChats = chats.filter((chat) => chat.status === "CLOSED");
  const awaitingReplyCount = openChats.filter(
    (chat) => chat.lastMessageSenderId != null && chat.lastMessageSenderId === chat.userId,
  ).length;

  function renderChatItem(chat: SupportChatListItem, isActive: boolean) {
    const awaitingReply =
      chat.lastMessageSenderId != null && chat.lastMessageSenderId === chat.userId;

    return (
      <Link
        key={chat.id}
        href={`/support?chat=${chat.id}`}
        className={`flex flex-col gap-1.5 rounded-xl border p-3 transition-colors ${
          isActive
            ? "border-primary/30 bg-primary/5"
            : "border-border/70 bg-background/60 hover:border-border hover:bg-background"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              {chat.userName}
            </span>
          </div>
          <span className="shrink-0 text-[0.65rem] text-muted-foreground">
            {formatSupportMessageTime(chat.updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {preview(chat.lastMessageBody)}
          </p>
          {awaitingReply ? (
            <Badge className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              Awaiting reply
            </Badge>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <header className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
                Support dashboard
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "rounded-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10",
                  tab === "conversations" && "bg-orange-500/10",
                )}
                nativeButton={false}
                render={<Link href="/support" />}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Conversations
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "rounded-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10",
                  tab === "bookings" && "bg-orange-500/10",
                )}
                nativeButton={false}
                render={<Link href="/support?tab=bookings" />}
              >
                <Ticket className="h-3.5 w-3.5" />
                Bookings
              </Button>
            </div>
          </div>

          {tab === "conversations" ? (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Open chats</p>
                <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
                  {openChats.length}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
                  {closedChats.length}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Awaiting reply</p>
                <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
                  {awaitingReplyCount}
                </p>
              </div>
            </div>
          ) : null}
        </header>

        {tab === "bookings" ? (
          <SupportBookingsView bookings={initialBookings} />
        ) : (
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

            {closedChats.length > 0 ? (
              <div className="space-y-2">
                <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Resolved
                </h2>
                <div className="flex flex-col gap-2">
                  {closedChats.map((chat) => renderChatItem(chat, chat.id === chatId))}
                </div>
              </div>
            ) : null}
          </aside>

          {/* Conversation detail */}
          <section className="min-w-0">
            {selectedChat ? (
              <SupportReplyPanel
                chatId={selectedChat.id}
                status={selectedChat.status}
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
        )}
      </div>
    </div>
  );
}
