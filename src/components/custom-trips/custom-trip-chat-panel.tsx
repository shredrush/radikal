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
import { FORM_FIELD_BORDER } from "@/lib/boundary-styles";
import { Button } from "@/components/ui/button";
import { useVisiblePolling } from "@/hooks/use-visible-polling";

const composerClassName =
  `w-full resize-none rounded-2xl border ${FORM_FIELD_BORDER} bg-background px-4 py-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-orange-400 focus-visible:ring-2 focus-visible:ring-orange-500/20 dark:focus:border-orange-400`;

export function CustomTripChatPanel({
  requestId,
  role,
  messages: initialMessages,
  onRequestChanged,
}: {
  requestId: string;
  role: "customer" | "support";
  messages: CustomTripMessageView[];
  onRequestChanged?: () => void;
}) {
  const [messages, setMessages] = useState<CustomTripMessageView[]>(initialMessages);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesFetchControllerRef = useRef<AbortController | null>(null);
  const cursorRef = useRef(initialMessages.at(-1)?.id ?? null);

  const loadMessages = useCallback(async (replaceActiveRequest = false) => {
    if (messagesFetchControllerRef.current) {
      if (!replaceActiveRequest) return;
      messagesFetchControllerRef.current.abort();
    }

    const controller = new AbortController();
    messagesFetchControllerRef.current = controller;
    try {
      const params = new URLSearchParams({ requestId });
      if (cursorRef.current) params.set("after", cursorRef.current);
      const response = await fetch(
        `/api/custom-trips/messages?${params.toString()}`,
        { cache: "no-store", signal: controller.signal },
      );
      if (!response.ok) return;

      const data = await response.json();
      const next = Array.isArray(data.messages) ? (data.messages as CustomTripMessageView[]) : [];
      if (next.length > 0) {
        cursorRef.current = next.at(-1)?.id ?? cursorRef.current;
        setMessages((previous) => {
          const knownIds = new Set(previous.map((message) => message.id));
          const additions = next.filter((message) => !knownIds.has(message.id));
          return additions.length > 0 ? [...previous, ...additions] : previous;
        });
      }
    } catch {
      // Ignore transient network errors; the next poll will retry.
    } finally {
      if (messagesFetchControllerRef.current === controller) {
        messagesFetchControllerRef.current = null;
      }
    }
  }, [requestId]);

  useEffect(() => {
    return () => {
      messagesFetchControllerRef.current?.abort();
    };
  }, [requestId]);

  useVisiblePolling(true, loadMessages, 15_000);

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
        await loadMessages(true);
        onRequestChanged?.();
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
        className="flex max-h-[28rem] min-h-[16rem] flex-col gap-3 overflow-y-auto rounded-[1.5rem] border border-emerald-100 bg-gradient-to-br from-orange-50/50 via-white to-emerald-50/50 p-4 dark:border-emerald-500/15 dark:from-orange-500/5 dark:via-card dark:to-emerald-500/5"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Your trip conversation is open</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Share a detail, question or idea and our team will pick it up here.
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
                      ? "rounded-br-sm bg-orange-600 text-white"
                      : "rounded-bl-sm border border-emerald-100 bg-white text-foreground dark:border-emerald-500/15 dark:bg-card"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p
                    className={`mt-1 text-[0.65rem] ${
                      message.isMine ? "text-white/70" : "text-muted-foreground"
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

      <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-[1.5rem] border border-orange-100 bg-orange-50/60 p-2 dark:border-orange-500/15 dark:bg-orange-500/5">
        <textarea
          name="body"
          placeholder={role === "support" ? "Write a reply…" : "Type your message…"}
          rows={2}
          maxLength={2000}
          className={composerClassName}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" size="lg" disabled={isPending} className="rounded-2xl bg-orange-600 px-4 text-white hover:bg-orange-500">
          <Send className="h-4 w-4" />
          {isPending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
