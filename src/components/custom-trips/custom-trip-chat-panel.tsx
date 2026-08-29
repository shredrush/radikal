"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import {
  replyCustomTripMessageAction,
  sendCustomTripMessageAction,
} from "@/lib/actions/custom-trips";
import {
  type CustomTripMessageView,
} from "@/lib/custom-trips";
import { formatMessageTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

const composerClassName =
  "w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-black focus-visible:ring-2 focus-visible:ring-black/10";

function sameThread(a: CustomTripMessageView[], b: CustomTripMessageView[]) {
  if (a.length !== b.length) return false;
  return a.every((message, index) => message.id === b[index]?.id);
}

export function CustomTripChatPanel({
  requestId,
  role,
  messages: initialMessages,
}: {
  requestId: string;
  role: "customer" | "support";
  messages: CustomTripMessageView[];
}) {
  const [messages, setMessages] = useState<CustomTripMessageView[]>(initialMessages);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/custom-trips/messages?requestId=${encodeURIComponent(requestId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data.messages) ? (data.messages as CustomTripMessageView[]) : [];
      setMessages((previous) => (sameThread(previous, next) ? previous : next));
    } catch {
      // Ignore transient network errors; the next poll will retry.
    }
  }, [requestId]);

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
        if (role === "support") {
          await replyCustomTripMessageAction(requestId, new FormData(form));
        } else {
          await sendCustomTripMessageAction(requestId, new FormData(form));
        }
        form.reset();
        await loadMessages();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not send message.";
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
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Send a message to get the conversation about your trip started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    message.isMine
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm border border-border/70 bg-background text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p
                    className={`mt-1 text-[0.65rem] ${
                      message.isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {formatMessageTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          name="body"
          placeholder={role === "support" ? "Write a reply…" : "Type your message…"}
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
          {isPending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
