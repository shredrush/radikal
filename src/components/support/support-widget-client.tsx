"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headset } from "lucide-react";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SupportChatPanel } from "@/components/support/support-chat-panel";

type WidgetState =
  | { kind: "checking" }
  | { kind: "unavailable" }
  | { kind: "anonymous" }
  | { kind: "agent" }
  | { kind: "customer"; status: "OPEN" | "CLOSED"; unreadCount: number; hasActiveChat: boolean };

export function SupportWidgetClient() {
  const [state, setState] = useState<WidgetState>({ kind: "checking" });
  const pathname = usePathname();

  const loadUnread = useCallback(async () => {
    try {
      const response = await fetch("/api/support/unread", { cache: "no-store" });

      if (response.status === 401) {
        setState({ kind: "anonymous" });
        return;
      }

      if (!response.ok) {
        setState({ kind: "unavailable" });
        return;
      }

      const data = (await response.json()) as {
        unreadCount?: number;
        status?: "OPEN" | "CLOSED";
        isSupportAgent?: boolean;
        hasActiveChat?: boolean;
      };

      if (data.isSupportAgent) {
        setState({ kind: "agent" });
        return;
      }

      setState({
        kind: "customer",
        status: data.status === "CLOSED" ? "CLOSED" : "OPEN",
        unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
        hasActiveChat: Boolean(data.hasActiveChat),
      });
    } catch {
      setState({ kind: "unavailable" });
    }
  }, []);

  useEffect(() => {
    // The widget lives in the root layout and stays mounted across client-side
    // navigations. Refetch on path changes so the bubble reflects the session
    // immediately after logging in or out, instead of waiting for a reload.
    const timer = setTimeout(() => {
      void loadUnread();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadUnread, pathname]);

  useEffect(() => {
    // Retry temporarily unavailable requests, but only poll healthy sessions
    // when there is an existing thread with unread-state changes to surface.
    if (state.kind !== "unavailable" && (state.kind !== "customer" || !state.hasActiveChat)) {
      return;
    }

    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, [state, loadUnread]);

  const unreadCount = state.kind === "customer" ? state.unreadCount : 0;

  return (
    <Dialog onOpenChange={(open) => {
      if (open) void loadUnread();
    }}>
      <DialogTrigger
        aria-label="Contact support"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_14px_35px_-15px_rgba(0,0,0,0.6)] transition hover:scale-105 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Headset className="size-6" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-rose-500 px-1 text-[0.65rem] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How can we help?</DialogTitle>
          <DialogDescription>
            Chat with our support team and we&apos;ll get back to you.
          </DialogDescription>
        </DialogHeader>

        {state.kind === "checking" ? (
          <p className="mt-5 text-sm text-muted-foreground">Checking support availability…</p>
        ) : state.kind === "unavailable" ? (
          <div className="mt-5 flex flex-col items-start gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Support is temporarily unavailable. Please try again shortly.
            </p>
            <Button size="sm" className="rounded-full" onClick={() => void loadUnread()}>
              Try again
            </Button>
          </div>
        ) : state.kind === "agent" ? (
          <div className="mt-5 flex flex-col items-start gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              You&apos;re signed in as a support agent. Open the board to
              review and reply to customer conversations.
            </p>
            <Button
              size="sm"
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/support" />}
            >
              <Headset className="size-4" />
              Open support board
            </Button>
          </div>
        ) : state.kind === "customer" ? (
          <div className="mt-5">
            <SupportChatPanel messages={[]} status={state.status} />
          </div>
        ) : state.kind === "anonymous" ? (
          <div className="mt-5 flex flex-col items-start gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Log in to start a conversation with our support team.
            </p>
            <Button
              size="sm"
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/login?callbackUrl=%2Fprofile%3Ftab%3Dsupport" />}
            >
              Log in to chat
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
