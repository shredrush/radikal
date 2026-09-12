import Link from "next/link";
import { ArrowRight, ChevronDown, ShieldCheck, Users as UsersIcon } from "lucide-react";

import { loadDb, prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminHardDeleteUserButton } from "@/components/admin/admin-hard-delete-user-button";
import { AdminRestoreUserButton } from "@/components/admin/admin-restore-user-button";
import { AdminUserSearch } from "@/components/admin/admin-user-search";
import { AdminDeactivateUserButton } from "@/components/admin/admin-deactivate-user-button";
import { formatLongDate, pluralize } from "@/lib/format";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS = ["USER", "GUIDE", "SUPPORT", "FINANCE", "CONTENT", "ADMIN", "ADMAX"] as const;

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

const PAGE_SIZE = 20;

type UserEntry = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  createdAt: Date;
  _count: { bookings: number; activityLogs: number };
};

function UserListEntry({
  user,
  isCurrentUser,
  deactivated = false,
  canHardDelete = false,
  canDeactivate = false,
}: {
  user: UserEntry;
  isCurrentUser: boolean;
  deactivated?: boolean;
  canHardDelete?: boolean;
  canDeactivate?: boolean;
}) {
  return (
    <article
      className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        deactivated
          ? "border-border/60 bg-muted/10 text-muted-foreground"
          : "border-border/70 bg-background/80 hover:bg-muted/20"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-heading text-sm font-semibold text-foreground">{user.name}</span>
          <Badge
            variant="outline"
            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] ${roleBadgeClass(user.role)}`}
          >
            {ROLE_LABELS[user.role] ?? user.role}
          </Badge>
          {deactivated ? (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[9px] font-medium text-foreground/70">
              Deactivated
            </Badge>
          ) : null}
          {isCurrentUser ? (
            <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[9px] font-medium text-foreground/70">
              You
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {user.username ? `@${user.username} · ` : ""}{user.email}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Joined {formatLongDate(user.createdAt)} · {pluralize(user._count.bookings, "booking")} · {pluralize(user._count.activityLogs, "activity event")}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {deactivated ? (
          <>
            <AdminRestoreUserButton userId={user.id} userName={user.name} />
            {canHardDelete ? <AdminHardDeleteUserButton userId={user.id} userName={user.name} /> : null}
          </>
        ) : (
          <>
            {canDeactivate ? <AdminDeactivateUserButton userId={user.id} userName={user.name} /> : null}
            <Link
              href={`/admin/users/${user.id}`}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground transition hover:bg-muted"
            >
              <ShieldCheck className="h-3 w-3" />
              Manage
              <ArrowRight className="h-3 w-3" />
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[] | undefined;
    role?: string | string[] | undefined;
    page?: string | string[] | undefined;
  }>;
}) {
  const session = await requirePermission("users.manage", "/login?callbackUrl=/admin/users");
  const { q, role, page: pageParam } = await searchParams;

  const search = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const roleFilter: "" | (typeof ROLE_OPTIONS)[number] =
    typeof role === "string" && (ROLE_OPTIONS as readonly string[]).includes(role)
      ? (role as (typeof ROLE_OPTIONS)[number])
      : "";
  const page = Math.max(
    1,
    Number.parseInt(typeof pageParam === "string" ? pageParam : "1", 10) || 1,
  );

  const where = {
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { username: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const activeWhere = { ...where, deletedAt: null };
  const deactivatedWhere = { ...where, deletedAt: { not: null } };

  const [users, deactivatedUsers, roleCounts, totalMatches] = await Promise.all([
    loadDb(
      "admin.users.list",
      () =>
        prisma.user.findMany({
          where: activeWhere,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
            deletedAt: true,
            createdAt: true,
            _count: { select: { bookings: true, activityLogs: true } },
          },
        }),
    ),
    loadDb(
      "admin.users.deactivated-list",
      () =>
        prisma.user.findMany({
          where: deactivatedWhere,
          orderBy: { deletedAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
            createdAt: true,
            _count: { select: { bookings: true, activityLogs: true } },
          },
        }),
    ),
    loadDb("admin.users.role-counts", () => prisma.user.groupBy({ by: ["role"], where: { deletedAt: null }, _count: { _all: true } })),
    loadDb("admin.users.total-matches", () => prisma.user.count({ where: activeWhere })),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalMatches / PAGE_SIZE));
  const totalUsers = roleCounts.reduce((sum, group) => sum + group._count._all, 0);

  const paginationHref = (targetPage: number) =>
    `/admin/users?${new URLSearchParams({
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(search ? { q: search } : {}),
      page: String(targetPage),
    }).toString()}`;
  const countForRole = (value: string) =>
    roleCounts.find((group) => group.role === value)?._count._all ?? 0;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Manage Users"
          description="Review all accounts and inspect their activity log."
          active="users"
          role={session.user.role}
        />

        <section className="min-w-0">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Total users</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{totalUsers}</p>
            </div>
            {(["USER", "GUIDE", "ADMIN", "SUPPORT"] as const).map((value) => (
              <div key={value} className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">{ROLE_LABELS[value]}</p>
                <p className="mt-2 font-heading text-2xl font-semibold text-foreground">
                  {countForRole(value)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto">
            <Link
              href="/admin/users"
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition ${
                roleFilter === ""
                  ? "border-black bg-black text-white"
                  : "border-border bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              All
            </Link>
            {ROLE_OPTIONS.map((value) => (
              <Link
                key={value}
                href={`/admin/users?role=${value}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition ${
                  roleFilter === value
                    ? "border-black bg-black text-white"
                    : "border-border bg-transparent text-foreground hover:bg-muted"
                }`}
              >
                {ROLE_LABELS[value]}
              </Link>
            ))}
          </div>

          <AdminUserSearch initialQuery={search} role={roleFilter || undefined} />
        </div>

        {users.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/80 bg-background/70 p-8 text-center text-sm text-muted-foreground">
            No users match this search. Try a different name, email, or username.
          </div>
        ) : (
          <div className="grid gap-2 xl:grid-cols-2">
            {users.map((user) => (
              <UserListEntry
                key={user.id}
                user={user}
                isCurrentUser={user.id === session.user.id}
                canDeactivate={user.id !== session.user.id}
              />
            ))}
          </div>
        )}

        {deactivatedUsers.length > 0 ? (
          <details className="group overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:px-5">
              <div>
                <p className="font-heading text-base font-semibold text-foreground">Deactivated accounts</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{deactivatedUsers.length} matching {pluralize(deactivatedUsers.length, "account")}</p>
              </div>
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="grid gap-2 border-t border-border/70 p-3 sm:p-4 xl:grid-cols-2">
              {deactivatedUsers.map((user) => (
                <UserListEntry
                  key={user.id}
                  user={user}
                  isCurrentUser={user.id === session.user.id}
                  deactivated
                  canHardDelete={session.user.role === "ADMAX"}
                />
              ))}
            </div>
          </details>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          <UsersIcon className="mr-1 inline h-3.5 w-3.5" />
          Showing {users.length} of {totalMatches} {pluralize(totalMatches, "account")}
        </p>

        {totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-4">
            {page > 1 ? (
              <Link
                href={paginationHref(page - 1)}
                className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground transition hover:bg-muted"
              >
                Previous
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">Previous</span>
            )}
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={paginationHref(page + 1)}
                className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground transition hover:bg-muted"
              >
                Next
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">Next</span>
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
