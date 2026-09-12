"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Globe, MapPin, Monitor, RefreshCw, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ADMIN_USER_ACTIVITY_PAGE_SIZE,
  activityBadgeClass,
  formatActivityAction,
} from "@/lib/activity-log-display";

export type AdminUserActivityEntry = {
  id: string;
  action: string;
  label: string;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
};

function extractGeo(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const geo = (metadata as Record<string, unknown>).geo;
  if (!geo || typeof geo !== "object" || Array.isArray(geo)) return null;
  const record = geo as Record<string, unknown>;
  const values = [record.city, record.region, record.country].filter(
    (value): value is string => typeof value === "string",
  );
  return values.length > 0 ? values.join(", ") : null;
}

function metadataWithoutGeo(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return metadata;
  const rest = { ...(metadata as Record<string, unknown>) };
  delete rest.geo;
  return Object.keys(rest).length > 0 ? rest : null;
}

function activityStatPills(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const record = metadata as Record<string, unknown>;
  const reserved = typeof record.reserved === "number" ? record.reserved : null;
  const booked = typeof record.booked === "number" ? record.booked : typeof record.bookingCount === "number" ? record.bookingCount : null;
  const capacity = typeof record.capacity === "number" ? record.capacity : null;
  return reserved === null && booked === null && capacity === null ? null : { booked, reserved, capacity };
}

export function AdminUserActivityLog({
  userId,
  initialActivityLogs,
  initialTotal,
}: {
  userId: string;
  initialActivityLogs: AdminUserActivityEntry[];
  initialTotal: number;
}) {
  const [activityLogs, setActivityLogs] = useState(initialActivityLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_USER_ACTIVITY_PAGE_SIZE));

  function loadPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages || isPending) return;
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/activity?page=${targetPage}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load activity log.");
        const data = (await response.json()) as {
          activityLogs: AdminUserActivityEntry[];
          page: number;
          total: number;
        };
        setActivityLogs(data.activityLogs);
        setPage(data.page);
        setTotal(data.total);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load activity log.");
      }
    });
  }

  return (
    <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
      <CardHeader className="border-b border-border/70 bg-muted/20">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="admin-user-activity-log"
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              {total === 0 ? "No events recorded yet." : `${total} ${pluralize(total, "event")}, newest first.`}
            </CardDescription>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </CardHeader>
      {open ? <CardContent id="admin-user-activity-log" className="pt-4" aria-busy={isPending}>
        {activityLogs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <UserX className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-border/70 pl-4">
            {activityLogs.map((log) => {
              const geo = extractGeo(log.metadata);
              const restMetadata = metadataWithoutGeo(log.metadata);
              const stats = activityStatPills(log.metadata);
              return (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[1.31rem] top-1.5 size-2 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${activityBadgeClass(log.action)}`}>
                      {formatActivityAction(log.action)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/90">{log.label}</p>
                  {stats ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {stats.booked !== null ? <Badge variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600">{stats.booked} booked</Badge> : null}
                      {stats.reserved !== null ? <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600">{stats.reserved} reserved</Badge> : null}
                      {stats.capacity !== null ? <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{stats.capacity} capacity</Badge> : null}
                    </div>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {geo ? <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{geo}</span> : null}
                    {log.ip ? <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{log.ip}</span> : null}
                    {log.userAgent ? <span className="inline-flex items-center gap-1.5"><Monitor className="h-3 w-3 shrink-0" /><span className="break-all">{log.userAgent}</span></span> : null}
                  </div>
                  {restMetadata ? <pre className="mt-2 overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground">{JSON.stringify(restMetadata, null, 2)}</pre> : null}
                </li>
              );
            })}
          </ol>
        )}
        {total > ADMIN_USER_ACTIVITY_PAGE_SIZE ? (
          <nav className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-4" aria-label="Activity log pagination">
            <button type="button" onClick={() => loadPage(page - 1)} disabled={page === 1 || isPending} className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
              Page {page} of {totalPages}
            </span>
            <button type="button" onClick={() => loadPage(page + 1)} disabled={page === totalPages || isPending} className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </nav>
        ) : null}
        {error ? <p className="mt-3 text-center text-xs text-destructive" role="alert">{error}</p> : null}
      </CardContent> : null}
    </Card>
  );
}
