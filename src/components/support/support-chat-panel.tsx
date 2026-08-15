"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, Inbox, MessageSquareOff, Send } from "lucide-react";
import { toast } from "sonner";

import {
  reopenSupportChatAction,
  resolveSupportChatAction,
  sendSupportMessageAction,
} from "@/lib/actions/support";
import type { SupportMessageView } from "@/lib/support";
import { SupportMessageList } from "@/components/support/support-message-list";
import { Button } from "@/components/ui/button";

const composerClassName =
  "w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-black focus-visible:ring-2 focus-visible:ring-black/10";

function sameThread(a: SupportMessageView[], b: SupportMessageView[]) {
  if (a.length !== b.length) return false;
  return a.every((message, index) => message.id === b[index]?.id);
}

export function SupportChatPanel({
  messages: initialMessages,
  status: initialStatus = "OPEN",
}: {
  messages: SupportMessageView[];
  status?: "OPEN" | "CLOSED";
}) {
  const [messages, setMessages] = useState<SupportMessageView[]>(initialMessages);
  const [status, setStatus] = useState<"OPEN" | "CLOSED">(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [isUpdating, startUpdating] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/support/messages", { cache: "no-store" });
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
  }, []);

  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length, status]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form).get("body")?.toString().trim();

    if (!body) return;

    startTransition(async () => {
      try {
        await sendSupportMessageAction(new FormData(form));
        form.reset();
        await loadMessages();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not send message.";
        toast.error(message);
      }
    });
  }

  function handleReopen() {
    startUpdating(async () => {
      try {
        await reopenSupportChatAction();
        setStatus("OPEN");
        await loadMessages();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not reopen chat.";
        toast.error(message);
      }
    });
  }

  function handleResolve() {
    startUpdating(async () => {
      try {
        await resolveSupportChatAction();
        setMessages([]);
        setStatus("OPEN");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not resolve chat.";
        toast.error(message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={scrollRef}
        className="flex max-h-[28rem] min-h-[16rem] flex-col gap-3 overflow-y-auto rounded-[1.2rem] border border-border/70 bg-muted/20 p-4"
      >
        {messages.length === 0 ? (
          status === "CLOSED" ? (
            <div className="flex flex-1 items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">This conversation has been closed.</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <p className="text-sm font-medium text-foreground">How can we help?</p>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Send us a message and a member of our support team will get back to you here.
              </p>
            </div>
          )
        ) : (
          <SupportMessageList messages={messages} />
        )}
      </div>

      {status === "CLOSED" ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-8 text-center">
          <MessageSquareOff className="h-7 w-7 text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">This conversation has been closed</p>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Our support team has ended this chat. Reopen it to continue the conversation, or
              mark it as resolved to clear it from your view.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={isUpdating}
              onClick={handleReopen}
            >
              <Inbox className="h-3.5 w-3.5" />
              Reopen chat
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              disabled={isUpdating}
              onClick={handleResolve}
            >
              <Check className="h-3.5 w-3.5" />
              Mark as resolved
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            name="body"
            placeholder="Type your message…"
            rows={2}
            className={composerClassName}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="rounded-xl px-4"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Sending…" : "Send"}
          </Button>
        </form>
      )}
    </div>
  );
}
