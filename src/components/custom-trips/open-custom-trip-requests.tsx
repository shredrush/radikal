import Link from "next/link";
import { CalendarDays, Compass, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CUSTOM_TRIP_GROUP_LABELS,
  CUSTOM_TRIP_STATUS_LABELS,
  CUSTOM_TRIP_STATUS_STYLES,
  formatCustomTripDateRange,
  type CustomTripRequestListItem,
} from "@/lib/custom-trips";

/**
 * The signed-in user's open custom trip request chats, shown on the custom
 * trip landing page so they can jump straight back into a conversation without
 * visiting their profile. Only the current account's own requests are ever
 * rendered, and the section is always visible so users can see their open
 * chats at a glance.
 */
export function OpenCustomTripRequests({
  requests,
}: {
  requests: CustomTripRequestListItem[];
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/80 bg-muted/20 p-5">
      <h2 className="font-heading text-base font-semibold text-foreground">
        Open requests
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Chats with our team for your active custom trips.
      </p>

      {requests.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-6 text-center">
          <Compass className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No open requests yet — start one on this page and it will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/custom-trip/${request.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 p-3 transition-colors hover:border-border"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-widest",
                        CUSTOM_TRIP_STATUS_STYLES[request.status] ?? CUSTOM_TRIP_STATUS_STYLES.NEW,
                      )}
                    >
                      {CUSTOM_TRIP_STATUS_LABELS[request.status] ?? request.status}
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground">
                      {CUSTOM_TRIP_GROUP_LABELS[request.groupType] ?? request.groupType} ·{" "}
                      {request.location || "Flexible location"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {formatCustomTripDateRange(request.startDate, request.endDate)}
                  </span>
                  {request.lastMessageBody ? (
                    <span className="truncate text-xs text-muted-foreground/80">
                      {request.lastMessageBody}
                    </span>
                  ) : null}
                </span>
                <MessageSquare className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:scale-110" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
