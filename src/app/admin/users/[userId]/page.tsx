import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { loadDb, prisma, safeDb } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminUserActivityLog } from "@/components/admin/admin-user-activity-log";
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

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await requirePermission("users.manage", "/login?callbackUrl=/admin/users");
  const { userId } = await params;

  const [user, activityLogs] = await Promise.all([
    loadDb(
      "admin.user-detail.user",
      () =>
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            guide: { select: { name: true, deletedAt: true } },
            _count: { select: { bookings: true, reviews: true, guideApplications: true, activityLogs: true } },
          },
        }),
    ),
    safeDb(
      "admin.user-detail.activity-log",
      () =>
        prisma.activityLog.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      [],
    ),
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
          description="Manage users"
          active="users"
          role={session.user.role}
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
                {user.deletedAt ? (
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] font-medium text-foreground/70">
                    Deactivated
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="space-y-1">
                {user.username ? (
                  <>
                    <span className="block">@{user.username}</span>
                    <span className="block">{user.email}</span>
                  </>
                ) : (
                  <span className="block">{user.email}</span>
                )}
                <span className="block">
                  Joined {formatLongDate(user.createdAt)}
                  {" · "}{pluralize(user._count.bookings, "booking")}
                  {" · "}{pluralize(user._count.reviews, "review")}
                  {" · "}{pluralize(user._count.guideApplications, "application")}
                </span>
                {user.guide && !user.guide.deletedAt ? (
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
                  deletedAt: user.deletedAt,
                }}
                isSelf={isSelf}
                canChangePassword={session.user.role === "ADMAX"}
              />
            </CardContent>
          </Card>

          <AdminUserActivityLog
            key={`${user._count.activityLogs}:${activityLogs[0]?.id ?? "none"}`}
            userId={user.id}
            initialActivityLogs={activityLogs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }))}
            initialTotal={user._count.activityLogs}
          />
        </div>
      </div>
    </div>
  );
}
