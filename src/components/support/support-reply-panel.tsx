"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Archive, Inbox, Send } from "lucide-react";
import { toast } from "sonner";

import {
  replySupportMessageAction,
  setSupportChatStatusAction,
} from "@/lib/actions/support";
import type { SupportMessageView } from "@/lib/support";
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { SupportMessageList } from "@/components/support/support-message-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const composerClassName =
  `w-full resize-none rounded-xl border ${FORM_FIELD_BORDER} bg-background/80 px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/30`;

function sameThread(a: SupportMessageView[], b: SupportMessageView[]) {
  if (a.length !== b.length) return false;
  return a.every((message, index) => message.id === b[index]?.id);
}

export function SupportReplyPanel({
  chatId,
  status: initialStatus,
  customerName,
  customerEmail,
  messages: initialMessages,
}: {
  chatId: string;
  status: "OPEN" | "CLOSED";
  customerName: string;
  customerEmail: string;
  messages: SupportMessageView[];
}) {
  const [messages, setMessages] = useState<SupportMessageView[]>(initialMessages);
  const [status, setStatus] = useState<"OPEN" | "CLOSED">(initialStatus);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/support/messages?chatId=${encodeURIComponent(chatId)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data.messages) ? (data.messages as SupportMessageView[]) : [];
      setMessages((previous) => (sameThread(previous, next) ? previous : next));

      if (data.status === "OPEN" || data.status === "CLOSED") {
        setStatus((previous) => (previous === data.status ? previous : data.status));
      }
    } catch {
      // Ignore transient network errors; the next poll will retry.
    }
  }, [chatId]);

  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form).get("body")?.toString().trim();

    if (!body) return;

    startTransition(async () => {
      try {
        await replySupportMessageAction(chatId, new FormData(form));
        form.reset();
        await loadMessages();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not send reply.";
        toast.error(message);
      }
    });
  }

  function handleToggleStatus() {
    const nextStatus = status === "OPEN" ? "CLOSED" : "OPEN";
    startTransition(async () => {
      try {
        await setSupportChatStatusAction(chatId, nextStatus);
        setStatus(nextStatus);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not update conversation.";
        toast.error(message);
      }
    });
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
        <div className="min-w-0">
          <p className="truncate font-heading text-base font-semibold text-foreground">
            {customerName}
          </p>
          <p className="truncate text-sm text-muted-foreground">{customerEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${
              status === "OPEN"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-muted-foreground/30 bg-muted text-muted-foreground"
            }`}
          >
            {status === "OPEN" ? "Open" : "Closed"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={isPending}
            onClick={handleToggleStatus}
          >
            {status === "OPEN" ? (
              <>
                <Archive className="h-3.5 w-3.5" />
                Close chat
              </>
            ) : (
              <>
                <Inbox className="h-3.5 w-3.5" />
                Reopen
              </>
            )}
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex max-h-[32rem] min-h-[20rem] flex-1 flex-col gap-3 overflow-y-auto rounded-[1.2rem] border border-border/70 bg-muted/20 p-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No messages in this conversation yet.</p>
          </div>
        ) : (
          <SupportMessageList messages={messages} />
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          name="body"
          placeholder="Write a reply…"
          rows={2}
          className={composerClassName}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" size="lg" disabled={isPending} className="rounded-xl px-4">
          <Send className="h-4 w-4" />
          {isPending ? "Sending…" : "Reply"}
        </Button>
      </form>
    </div>
  );
}
