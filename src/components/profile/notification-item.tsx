"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { markNotificationReadAction } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

export function NotificationItem({
  id,
  title,
  body,
  createdAtLabel,
  href,
  read,
}: {
  id: string;
  title: string;
  body: string;
  createdAtLabel: string;
  href: string | null;
  read: boolean;
}) {
  function handleClick() {
    void markNotificationReadAction(id);
  }

  return (
    <li
      onClick={handleClick}
      className={cn(
        "cursor-pointer rounded-[1.2rem] border px-4 py-3 transition-colors",
        read ? "border-border/70 bg-background/60" : "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
          <p className="mt-2 text-xs text-muted-foreground/70">{createdAtLabel}</p>
        </div>
        {!read ? (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4"
        >
          View <ExternalLink className="h-3 w-3" />
        </Link>
      ) : null}
    </li>
  );
}
