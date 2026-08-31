"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, History, XCircle } from "lucide-react";

import {
  GuideApplicationDetails,
  type GuideApplicationView,
} from "@/components/admin/guide-application-details";
import { Badge } from "@/components/ui/badge";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type GuideApplicationHistoryItem = GuideApplicationView & {
  reviewedAt: Date | null;
  reviewedBy: { name: string } | null;
};

function statusBadge(status: GuideApplicationHistoryItem["status"]) {
  if (status === "APPROVED") {
    return (
      <Badge variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-full border-destructive/40 bg-destructive/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-destructive">
      <XCircle className="h-3 w-3" /> Rejected
    </Badge>
  );
}

export function GuideApplicationHistory({ applications }: { applications: GuideApplicationHistoryItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (applications.length === 0) {
    return (
      <div className="rounded-[1.2rem] border border-border/70 bg-background/95 p-10 text-center shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
        <History className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No reviewed applications yet. Approve or reject an application to move it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {applications.map((application) => {
        const open = openId === application.id;
        return (
          <section
            key={application.id}
            className="overflow-hidden rounded-[1.2rem] border border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : application.id)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/10"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <span className="font-medium text-foreground">{application.name}</span>
                <span className="text-sm text-muted-foreground">
                  {application.user.username ? `@${application.user.username}` : "no username"}
                </span>
                {statusBadge(application.status)}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {application.reviewedAt ? `Reviewed ${formatLongDate(application.reviewedAt)}` : ""}
                  {application.reviewedBy?.name ? ` by ${application.reviewedBy.name}` : ""}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    open && "rotate-180",
                  )}
                />
              </div>
            </button>
            <div
              className={cn(
                "grid transition-all duration-200 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="border-t border-border/70 px-6 pb-6 pt-5">
                  <GuideApplicationDetails application={application} />
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
