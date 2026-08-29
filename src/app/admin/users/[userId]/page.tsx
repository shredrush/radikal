import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, MapPin, Monitor, UserX } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { countPendingTripChanges } from "@/lib/admin-stats";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUserForm } from "@/components/admin/admin-user-form";
import { formatLongDate, pluralize } from "@/lib/format";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  USER: "Traveller",
  GUIDE: "Guide",
  SUPPORT: "Support",
  FINANCE: "Finance",
  CONTENT: "Content",
  ADMIN: "Operations admin",
  ADMAX: "Super admin",
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
  USER: "border-border/70 bg-background/80 text-muted-foreground",
  GUIDE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  SUPPORT: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  FINANCE: "border-teal-500/40 bg-teal-500/10 text-teal-600",
  CONTENT: "border-pink-500/40 bg-pink-500/10 text-pink-600",
  ADMIN: "border-blue-500/40 bg-blue-500/10 text-blue-600",
  ADMAX: "border-violet-500/40 bg-violet-500/10 text-violet-600",
};

function roleBadgeClass(role: string) {
  return ROLE_BADGE_CLASSES[role] ?? ROLE_BADGE_CLASSES.USER;
}

function actionBadgeClass(action: string) {
  if (action.startsWith("LOGIN") || action === "ACCOUNT_CREATED" || action.startsWith("PASSWORD") || action === "USERNAME_CHANGED") {
    return "border-blue-500/40 bg-blue-500/10 text-blue-600";
  }
  if (action.startsWith("BOOKING") || action.startsWith("PAYMENT")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600";
  }
  if (action.startsWith("GUIDE")) {
    return "border-violet-500/40 bg-violet-500/10 text-violet-600";
  }
  if (action.startsWith("SUPPORT")) {
    return "border-amber-500/40 bg-amber-500/10 text-amber-600";
  }
  if (action.startsWith("USER_ROLE") || action.startsWith("USER_PROFILE")) {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }
  return "border-border/70 bg-background/80 text-muted-foreground";
}

function formatAction(action: string) {
  return action.toLowerCase().replace(/_/g, " ");
}

type GeoDisplay = {
  country: string | null;
  region: string | null;
  city: string | null;
};

function extractGeo(metadata: unknown): GeoDisplay | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const geo = (metadata as Record<string, unknown>).geo;
  if (!geo || typeof geo !== "object" || Array.isArray(geo)) return null;
  const record = geo as Record<string, unknown>;
  const country = typeof record.country === "string" ? record.country : null;
  const region = typeof record.region === "string" ? record.region : null;
  const city = typeof record.city === "string" ? record.city : null;
  if (!country && !region && !city) return null;
  return { country, region, city };
}

/** Return metadata with the `geo` key removed, or null when nothing else remains. */
function metadataWithoutGeo(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return metadata;
  const rest = { ...(metadata as Record<string, unknown>) };
  delete rest.geo;
  return Object.keys(rest).length > 0 ? rest : null;
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await requirePermission("users.manage", "/login?callbackUrl=/admin/users");
  const { userId } = await params;

  const [user, activityLogs, pendingTripChanges] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        guide: { select: { name: true } },
        _count: { select: { bookings: true, reviews: true, guideApplications: true, activityLogs: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    countPendingTripChanges(),
  ]);

  if (!user) {
    notFound();
  }

  const isSelf = session.user.id === user.id;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="User Details"
          description="Update this account's details and role, and review its full activity history."
          active="users"
          role={session.user.role}
          pendingTripChanges={pendingTripChanges}
        />

        <Link
          href="/admin/users"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all users
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <CardHeader className="border-b border-border/70 bg-muted/20">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{user.name}</CardTitle>
                <Badge variant="outline" className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${roleBadgeClass(user.role)}`}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
                {isSelf ? (
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium text-foreground/70">
                    You
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="space-y-1">
                <span className="block">{user.username ? `@${user.username} · ` : ""}{user.email}</span>
                <span className="block">
                  Joined {formatLongDate(user.createdAt)}
                  {" · "}{pluralize(user._count.bookings, "booking")}
                  {" · "}{pluralize(user._count.reviews, "review")}
                  {" · "}{pluralize(user._count.guideApplications, "application")}
                </span>
                {user.guide ? (
                  <span className="block">
                    Linked guide:{" "}
                    <Link href={`/admin/guides`} className="text-primary underline underline-offset-4">
                      {user.guide.name}
                    </Link>
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AdminUserForm
                user={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  username: user.username,
                  role: user.role,
                }}
                isSelf={isSelf}
              />
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <CardHeader className="border-b border-border/70 bg-muted/20">
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                {activityLogs.length === 200
                  ? "Latest 200 events, newest first."
                  : `${pluralize(activityLogs.length, "event")}, newest first.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
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
                    return (
                    <li key={log.id} className="relative">
                      <span className="absolute -left-[1.31rem] top-1.5 size-2 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${actionBadgeClass(log.action)}`}>
                          {formatAction(log.action)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground/90">{log.label}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {geo ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[geo.city, geo.region, geo.country].filter(Boolean).join(", ")}
                          </span>
                        ) : null}
                        {log.ip ? (
                          <span className="inline-flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {log.ip}
                          </span>
                        ) : null}
                        {log.userAgent ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Monitor className="h-3 w-3 shrink-0" />
                            <span className="break-all">{log.userAgent}</span>
                          </span>
                        ) : null}
                      </div>
                      {restMetadata ? (
                        <pre className="mt-2 overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-2 text-[11px] leading-relaxed text-muted-foreground">
                          {JSON.stringify(restMetadata, null, 2)}
                        </pre>
                      ) : null}
                    </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
