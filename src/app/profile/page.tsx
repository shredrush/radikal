import Link from "next/link";
import Image from "next/image";
import { default as dynamicImport } from "next/dynamic";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  AtSign,
  Ban,
  Bell,
  Camera,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Headset,
  Heart,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Settings2,
  Ticket,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma, safeDb } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getProfileUser } from "@/lib/profile-user";
import { bookingCardSelect } from "@/lib/booking-card";
import { getAdminBoardHref } from "@/lib/admin-sections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfilePhotoForm } from "@/components/profile/profile-photo-form";
import { getProfileInitials } from "@/lib/profile-initials";
import { getGuideImage } from "@/lib/guide-images";
import { LogoutButton } from "@/components/profile/logout-button";
import { getTripCardImage } from "@/lib/trip-card-image";
import { formatTripDateRange } from "@/lib/trip-dates";
import {
  toSupportMessageViews,
  type SupportMessageView,
} from "@/lib/support";
import { toCustomTripRequestListItem } from "@/lib/custom-trips";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { completePastBookings } from "@/lib/booking-completion";
import { cn } from "@/lib/utils";

// Tab-only client components are lazy-loaded so the initial profile bundle
// only ships the hero, the sidebar, and the active tab's code. Each chunk is
// still server-rendered on the tab that uses it, so there is no paint flash.
const LazyBookingsSectionDynamic = dynamicImport(
  () => import("@/components/profile/lazy-bookings-section").then((m) => m.LazyBookingsSection),
  { loading: () => null },
);
const BookingCardDynamic = dynamicImport(
  () => import("@/components/profile/booking-card").then((m) => m.BookingCard),
  {
    loading: () => (
      <div className="rounded-[1rem] border border-border/70 bg-background/60 p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    ),
  },
);
const WishlistCardDynamic = dynamicImport(
  () => import("@/components/profile/wishlist-card").then((m) => m.WishlistCard),
  {
    loading: () => (
      <div className="rounded-[1rem] border border-border/70 bg-background/60 p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    ),
  },
);
const NotificationItemDynamic = dynamicImport(
  () => import("@/components/profile/notification-item").then((m) => m.NotificationItem),
  { loading: () => null },
);
const SupportChatPanelDynamic = dynamicImport(
  () => import("@/components/support/support-chat-panel").then((m) => m.SupportChatPanel),
  { loading: () => null },
);
const ChangeUsernameFormDynamic = dynamicImport(
  () => import("@/components/profile/change-username-form").then((m) => m.ChangeUsernameForm),
  { loading: () => null },
);
const ChangePasswordFormDynamic = dynamicImport(
  () => import("@/components/profile/change-password-form").then((m) => m.ChangePasswordForm),
  { loading: () => null },
);
const CustomTripRequestCardDynamic = dynamicImport(
  () =>
    import("@/components/custom-trips/custom-trip-request-card").then(
      (m) => m.CustomTripRequestCard,
    ),
  { loading: () => null },
);
const CustomTripRequestEmptyDynamic = dynamicImport(
  () =>
    import("@/components/custom-trips/custom-trip-request-card").then(
      (m) => m.CustomTripRequestEmpty,
    ),
  { loading: () => null },
);

export const metadata: Metadata = {
  title: "Profile — Radikal",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; section?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }

  const user = session.user;
  const name = user.name ?? user.email ?? "User";
  const firstName = name.split(" ")[0];
  const profileInitials = getProfileInitials(name);

  const { tab, section } = await searchParams;
  const activeSection = section === "username" ? "username" : "password";
  const isGuide = user.role === "GUIDE";
  const activeTab =
    tab === "settings"
      ? "settings"
      : tab === "support"
        ? "support"
        : tab === "notifications"
          ? "notifications"
          : tab === "wishlist"
            ? "wishlist"
            : "bookings";
  const canAccessSupportDesk = hasPermission(user.role, "support.manage");
  const canReadAllBookings = hasPermission(user.role, "bookings.read");
  const isStaffView = canReadAllBookings;
  const adminBoardHref = getAdminBoardHref(user.role);

  // Persist the user's own past CONFIRMED bookings as COMPLETED so the hero
  // stats and the sections below read the true state on every tab. Scoped to
  // this user only (and indexed by userId + status), so it stays cheap — the
  // platform-wide sweep runs once a day via /api/cron/complete-bookings.
  await safeDb(
    "profile.complete-past-bookings",
    () => completePastBookings(new Date(), user.id),
    undefined,
  );

  // Fetch only the queries the active tab needs, all in parallel. The page
  // previously ran every query (including the platform-wide "all bookings"
  // list and the full support thread) on every render regardless of tab.
  // Staff skip their personal booking rows and the platform-wide list entirely
  // — those sections lazy-load on expand — keeping only cheap counts for the
  // hero stats.
  const [
    currentUser,
    guide,
    bookings,
    wishlistItems,
    customTripRequests,
    notifications,
    userReviews,
    supportChat,
    supportUnread,
    personalBookingCounts,
  ] = await Promise.all([
    // Deduped with the site header via React cache() — one row per request.
    safeDb("profile.user", () => getProfileUser(user.id), null),
    isGuide
      ? safeDb(
          "profile.guide",
          () =>
            prisma.guide.findFirst({
              where: { userId: user.id, deletedAt: null },
              select: { id: true, user: { select: { username: true } } },
            }),
          null,
        )
      : Promise.resolve(null),
    // Full booking rows only when the bookings tab renders them; the hero stats
    // come from cheap counts otherwise. Staff never load their rows here — their
    // sections lazy-load through /api/profile/bookings on expand.
    !isStaffView && activeTab === "bookings"
      ? safeDb(
          "profile.bookings",
          () =>
            prisma.booking.findMany({
              where: { userId: user.id, deletedAt: null, trip: { deletedAt: null } },
              orderBy: { createdAt: "desc" },
              // Only the columns the booking card renders (was `include: trip,
              // slot`, which dragged every Trip column and slot row into memory).
              select: bookingCardSelect,
            }),
          [],
        )
      : Promise.resolve([]),
    activeTab === "wishlist"
      ? safeDb(
          "profile.wishlist",
          () =>
            prisma.wishlistItem.findMany({
              where: { userId: user.id, deletedAt: null, trip: { deletedAt: null } },
              orderBy: { createdAt: "desc" },
              // Only the columns the wishlist card renders instead of the whole
              // Trip row (description, slots, guide, inclusions, …).
              select: {
                id: true,
                trip: {
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                    location: true,
                    priceInRupees: true,
                    durationDays: true,
                    images: true,
                  },
                },
              },
            }),
          [],
        )
      : Promise.resolve([]),
    activeTab === "bookings" && !canReadAllBookings
      ? safeDb(
          "profile.custom-trips",
          () =>
            prisma.customTripRequest.findMany({
              where: { userId: user.id, deletedAt: null },
              orderBy: { createdAt: "desc" },
              include: {
                user: { select: { id: true, name: true, email: true, username: true } },
                chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
              },
            }),
          [],
        )
      : Promise.resolve([]),
    // Full list only when the notifications tab is open; otherwise just the
    // unread count for the sidebar badge.
    activeTab === "notifications"
      ? safeDb(
          "profile.notifications",
          () =>
            prisma.notification.findMany({
              where: { userId: user.id },
              orderBy: { createdAt: "desc" },
              take: 50,
            }),
          [],
        )
      : safeDb(
          "profile.notifications-unread",
          () =>
            prisma.notification.count({
              where: { userId: user.id, readAt: null },
            }),
          0,
        ),
    activeTab === "bookings" && !isStaffView
      ? safeDb(
          "profile.reviews",
          () =>
            prisma.review.findMany({
              where: { userId: user.id },
              select: { id: true, tripId: true, rating: true, comment: true },
            }),
          [],
        )
      : Promise.resolve([]),
    !canAccessSupportDesk && activeTab === "support"
      ? safeDb(
          "profile.support-chat",
          () =>
            prisma.supportChat.findUnique({
              where: { userId: user.id, deletedAt: null },
              include: { messages: { orderBy: { createdAt: "asc" } } },
            }),
          null,
        )
      : Promise.resolve(null),
    !canAccessSupportDesk
      ? safeDb(
          "profile.support-unread",
          () =>
            prisma.$queryRaw<
              Array<{ status: string; unreadCount: number }>
            >`
          SELECT sc."status", COUNT(sm.id)::int AS "unreadCount"
          FROM support_chats sc
          LEFT JOIN support_messages sm
            ON sm."chatId" = sc.id
           AND sm."senderId" <> ${user.id}
           AND sm."createdAt" > COALESCE(sc."customerLastReadAt", sc."createdAt")
          WHERE sc."userId" = ${user.id}
            AND sc."deletedAt" IS NULL
          GROUP BY sc.id, sc."status"
        `,
          null,
        )
      : Promise.resolve(null),
    // Hero stats: staff always count, and non-staff use counts whenever the
    // full booking list isn't loaded (i.e. outside the bookings tab).
    isStaffView || activeTab !== "bookings"
      ? safeDb(
          "profile.booking-counts",
          () =>
            (async () => {
              const [total, confirmed] = await Promise.all([
                prisma.booking.count({ where: { userId: user.id, deletedAt: null, trip: { deletedAt: null } } }),
                prisma.booking.count({ where: { userId: user.id, status: "CONFIRMED", deletedAt: null, trip: { deletedAt: null } } }),
              ]);
              return { total, upcoming: confirmed };
            })(),
          null,
        )
      : Promise.resolve(null),
  ]);

  const profileImage = currentUser?.guide
    ? getGuideImage({
        username: currentUser.guide.user?.username ?? "",
        photo: currentUser.guide.photo,
        photos: currentUser.guide.photos,
      })
    : currentUser?.image;

  const notificationList = Array.isArray(notifications) ? notifications : [];
  const unreadNotificationsCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.readAt).length
    : notifications;

  const upcoming = bookings.filter((b) => b.status === "CONFIRMED").length;
  const heroBookingCount =
    isStaffView || activeTab !== "bookings"
      ? (personalBookingCounts?.total ?? 0)
      : bookings.length;
  const heroUpcomingCount =
    isStaffView || activeTab !== "bookings"
      ? (personalBookingCounts?.upcoming ?? 0)
      : upcoming;

  // Completion is persisted (lib/booking-completion.ts runs before the reads
  // above), so the DB status is the single source of truth for completed vs
  // active.
  const completedBookings = bookings.filter((booking) => booking.status === "COMPLETED");

  const cancelledBookings = bookings.filter((booking) => booking.status === "CANCELLED");

  // Completed and cancelled trips get their own sections, so keep them out of
  // the main "Your bookings" list to avoid showing each trip twice.
  const activeBookings = bookings.filter(
    (booking) => booking.status !== "COMPLETED" && booking.status !== "CANCELLED",
  );

  // The user's existing reviews, keyed by trip so the completed-trips list can
  // offer "Leave a review" for unreviewed trips and "Edit review" for reviewed
  // ones (with the previous rating/comment pre-filled).
  const reviewsByTripId = new Map(
    userReviews
      .filter((review): review is typeof review & { tripId: string } =>
        Boolean(review.tripId),
      )
      .map((review) => [review.tripId, review] as const),
  );

  let supportMessages: SupportMessageView[] = [];
  const supportUnreadRow = supportUnread?.[0];
  const supportChatStatus: "OPEN" | "CLOSED" =
    supportUnreadRow?.status === "CLOSED" ? "CLOSED" : "OPEN";
  const supportUnreadCount = supportUnreadRow?.unreadCount ?? 0;
  if (!canAccessSupportDesk && supportChat) {
    supportMessages = toSupportMessageViews(supportChat.messages, user.id);
  }

  const completedTripsSection = (
    <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <CardHeader>
        <CardTitle>Completed trips</CardTitle>
        <CardDescription>
          Trips you&apos;ve already finished with Radikal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {completedBookings.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">No completed trips yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Trips you finish will appear here once their dates have passed.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {completedBookings.map((booking) => (
              <li key={booking.id}>
                <BookingCardDynamic
                  booking={{
                    id: booking.id,
                    tripSlug: booking.trip.slug,
                    title: booking.trip.title,
                    location: booking.trip.location,
                    image: getTripCardImage(booking.trip),
                    dateRange: formatTripDateRange(
                      booking.slot.date,
                      booking.trip.durationDays
                    ),
                    participantCount: booking.participantCount,
                    totalPriceRupees: booking.totalPriceRupees,
                    status: "COMPLETED",
                    paymentTransactionId: booking.paymentTransactionId,
                    bookedAt: booking.createdAt.toISOString(),
                    cancellationReason: booking.cancellationReason,
                    showReview: true,
                    review: reviewsByTripId.get(booking.tripId) ?? null,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  const cancelledTripsSection = (
    <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <CardHeader>
        <CardTitle>Cancelled trips</CardTitle>
        <CardDescription>
          Trips you&apos;ve cancelled or that were cancelled before they started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cancelledBookings.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
            <Ban className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="font-medium text-foreground">No cancelled trips</p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {cancelledBookings.map((booking) => (
              <li key={booking.id}>
                <BookingCardDynamic
                  booking={{
                    id: booking.id,
                    tripSlug: booking.trip.slug,
                    title: booking.trip.title,
                    location: booking.trip.location,
                    image: getTripCardImage(booking.trip),
                    dateRange: formatTripDateRange(
                      booking.slot.date,
                      booking.trip.durationDays
                    ),
                    participantCount: booking.participantCount,
                    totalPriceRupees: booking.totalPriceRupees,
                    status: "CANCELLED",
                    paymentTransactionId: booking.paymentTransactionId,
                    bookedAt: booking.createdAt.toISOString(),
                    cancellationReason: booking.cancellationReason,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        {/* Hero */}
        <div className="rounded-[1.5rem] border border-border/80 p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="-my-5 -ml-5 flex w-44 shrink-0 flex-col items-center gap-1.5 sm:-my-6 sm:-ml-6 sm:w-56 sm:self-stretch">
                <ProfilePhotoForm
                  currentImage={currentUser?.image ?? null}
                  trigger={
                    <button
                      type="button"
                      className="group relative h-full w-full cursor-pointer overflow-hidden rounded-l-[1.5rem] ring-1 ring-border/70"
                    >
                      {profileImage ? (
                        <Image
                          src={profileImage}
                          alt={name}
                          width={224}
                          height={224}
                          className="aspect-square h-44 w-full object-cover sm:aspect-auto sm:h-full sm:min-h-56"
                        />
                      ) : (
                        <div className="flex aspect-square h-44 w-full items-center justify-center bg-gradient-to-br from-[#3a3a3a] to-[#5a5a5a] font-heading text-5xl font-semibold text-white sm:aspect-auto sm:h-full sm:min-h-56">
                          {profileInitials}
                        </div>
                      )}
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-zinc-500/55 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-white transition-colors group-hover:bg-zinc-500/65">
                        <Camera className="size-3" />
                        Edit profile photo
                      </span>
                    </button>
                  }
                />
              </div>
              <div className="flex min-w-0 flex-col self-stretch pt-1">
                <h1 className="truncate font-heading text-lg font-semibold tracking-wide sm:text-xl">
                  Welcome back, {firstName}
                </h1>
                <p className="truncate text-sm text-muted-foreground">
                  {user.username ? `@${user.username}` : user.email}
                </p>
                {isGuide && guide ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-full"
                    nativeButton={false}
                    render={<Link href={`/${guide.user?.username}`} target="_blank" rel="noopener noreferrer" />}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View public profile
                  </Button>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Ticket className="h-4 w-4 text-primary" />
                    <strong className="font-semibold text-foreground">{heroBookingCount}</strong>{" "}
                    bookings
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <strong className="font-semibold text-foreground">{heroUpcomingCount}</strong>{" "}
                    upcoming
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              {isGuide ? (
                <Button
                  size="sm"
                  className="w-full justify-start rounded-full sm:w-auto"
                  nativeButton={false}
                  render={<Link href="/guide-board/bookings" />}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Guide board
                </Button>
              ) : null}
              {adminBoardHref ? (
                <Button
                  size="sm"
                  className="w-full justify-start rounded-full sm:w-auto"
                  nativeButton={false}
                  render={<Link href={adminBoardHref} />}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Admin board
                </Button>
              ) : null}
              {canAccessSupportDesk ? (
                <Button
                  size="sm"
                  className="w-full justify-start rounded-full sm:w-auto"
                  nativeButton={false}
                  render={<Link href="/support" />}
                >
                  <Headset className="h-3.5 w-3.5" />
                  Support board
                </Button>
              ) : null}
            </div>
          </div>

        </div>

        <div
          className={cn(
            "grid gap-6",
            activeTab === "settings"
              ? "lg:grid-cols-[220px_280px_1fr]"
              : "lg:grid-cols-[220px_1fr]"
          )}
        >
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <nav className="flex gap-2 overflow-x-auto lg:flex-col">
              <Link
                href="/profile?tab=bookings"
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                  activeTab === "bookings"
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Ticket className="h-4 w-4" />
                Bookings
              </Link>
              <Link
                href="/profile?tab=wishlist"
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                  activeTab === "wishlist"
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>
              <Link
                href="/profile?tab=notifications"
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                  activeTab === "notifications"
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Bell className="h-4 w-4" />
                Notifications
                {unreadNotificationsCount > 0 ? (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold leading-none text-white">
                    {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/profile?tab=settings"
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                  activeTab === "settings"
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Settings2 className="h-4 w-4" />
                Settings
              </Link>
              <Link
                href="/profile?tab=support"
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                  activeTab === "support"
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                Support
                {supportUnreadCount > 0 ? (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-bold leading-none text-white">
                    {supportUnreadCount > 9 ? "9+" : supportUnreadCount}
                  </span>
                ) : null}
              </Link>
              <LogoutButton />
            </nav>
          </aside>

          {activeTab === "settings" ? (
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <nav className="flex gap-2 overflow-x-auto lg:flex-col">
                <Link
                  href="/profile?tab=settings&section=password"
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                    activeSection === "password"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <KeyRound className="h-4 w-4" />
                  Change password
                </Link>
                <Link
                  href="/profile?tab=settings&section=username"
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                    activeSection === "username"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <AtSign className="h-4 w-4" />
                  Change username
                </Link>
              </nav>
            </aside>
          ) : null}

          {/* Content */}
          <div className="min-w-0">
            {activeTab === "settings" ? (
              <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                <CardHeader>
                  <CardTitle>
                    {activeSection === "username" ? "Change username" : "Change password"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeSection === "username" ? (
                    <ChangeUsernameFormDynamic currentUsername={user.username ?? null} />
                  ) : (
                    <ChangePasswordFormDynamic />
                  )}
                </CardContent>
              </Card>
            ) : activeTab === "wishlist" ? (
              <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                <CardHeader>
                  <CardTitle>Wishlist</CardTitle>
                  <CardDescription>
                    Trips you&apos;ve saved for later.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {wishlistItems.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                      <Heart className="h-8 w-8 text-muted-foreground/50" />
                      <div>
                        <p className="font-medium text-foreground">Your wishlist is empty</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Tap the heart on any trip page to save it here.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full"
                        nativeButton={false}
                        render={<Link href="/trips" />}
                      >
                        Explore trips
                      </Button>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {wishlistItems.map((item) => (
                        <li key={item.id}>
                          <WishlistCardDynamic trip={item.trip} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : activeTab === "notifications" ? (
              <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>
                        Updates about your bookings, trips, and account.
                      </CardDescription>
                    </div>
                    {unreadNotificationsCount > 0 ? (
                      <form action={markAllNotificationsReadAction}>
                        <Button type="submit" variant="outline" size="sm" className="rounded-full">
                          Mark all read
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {notificationList.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/50" />
                      <div>
                        <p className="font-medium text-foreground">No notifications yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          When something important happens, it will show up here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {notificationList.map((notification) => (
                        <NotificationItemDynamic
                          key={notification.id}
                          id={notification.id}
                          title={notification.title}
                          body={notification.body}
                          createdAtLabel={formatDateTime(notification.createdAt)}
                          href={notification.href}
                          read={Boolean(notification.readAt)}
                        />
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : activeTab === "support" ? (
              canAccessSupportDesk ? (
                <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                  <CardHeader>
                    <CardTitle>Support board</CardTitle>
                    <CardDescription>
                      Review and reply to customer conversations from the support desk.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-start gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 p-6">
                      <Headset className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Open the support board to see open chats and reply to customers.
                      </p>
                      <Button
                        size="sm"
                        className="rounded-full"
                        nativeButton={false}
                        render={<Link href="/support" />}
                      >
                        <Headset className="h-3.5 w-3.5" />
                        Open support board
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                  <CardHeader>
                    <CardTitle>Contact support</CardTitle>
                    <CardDescription>
                      Message our support team and keep the conversation right here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SupportChatPanelDynamic messages={supportMessages} status={supportChatStatus} />
                  </CardContent>
                </Card>
              )
            ) : canReadAllBookings ? (
              <div className="flex flex-col gap-6">
                <LazyBookingsSectionDynamic
                  kind="upcoming"
                  title="Upcoming trips"
                  endpoint="/api/profile/bookings?kind=upcoming"
                  emptyTitle="No upcoming trips"
                  emptyDescription="Once you book a trip, it will show up here with its status."
                />

                <LazyBookingsSectionDynamic
                  kind="completed"
                  title="Completed trips"
                  description="Trips you've already finished with Radikal."
                  endpoint="/api/profile/bookings?kind=completed"
                  emptyTitle="No completed trips yet"
                  emptyDescription="Trips you finish will appear here once their dates have passed."
                />

                <LazyBookingsSectionDynamic
                  kind="cancelled"
                  title="Cancelled trips"
                  description="Trips you've cancelled or that were cancelled before they started."
                  endpoint="/api/profile/bookings?kind=cancelled"
                  emptyTitle="No cancelled trips"
                  emptyDescription="Trips you cancel will appear here so you can still see the details."
                />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                  <CardHeader>
                    <CardTitle>Upcoming trips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activeBookings.length === 0 ? (
                      <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                        <Ticket className="h-8 w-8 text-muted-foreground/50" />
                        <div>
                          <p className="font-medium text-foreground">
                            {bookings.length === 0 ? "No bookings yet" : "No active bookings"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {bookings.length === 0
                              ? "Once you book a trip, it will show up here with its status."
                              : "Finished and cancelled trips are listed in their own sections below."}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-full"
                          nativeButton={false}
                          render={<Link href="/trips" />}
                        >
                          Explore trips
                        </Button>
                      </div>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {activeBookings.map((booking) => (
                          <li key={booking.id}>
                            <BookingCardDynamic
                              booking={{
                                id: booking.id,
                                tripSlug: booking.trip.slug,
                                title: booking.trip.title,
                                location: booking.trip.location,
                                image: getTripCardImage(booking.trip),
                                dateRange: formatTripDateRange(
                                  booking.slot.date,
                                  booking.trip.durationDays
                                ),
                                participantCount: booking.participantCount,
                                totalPriceRupees: booking.totalPriceRupees,
                                status: booking.status,
                                paymentTransactionId: booking.paymentTransactionId,
                                bookedAt: booking.createdAt.toISOString(),
                                cancellationReason: booking.cancellationReason,
                                showUserCancel: true,
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {completedTripsSection}

                <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                  <CardHeader>
                    <CardTitle>Custom trips</CardTitle>
                    <CardDescription>
                      Private group and corporate trips you&apos;ve requested on your own dates.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customTripRequests.length === 0 ? (
                      <CustomTripRequestEmptyDynamic />
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {customTripRequests.map((request) => (
                          <li key={request.id}>
                            <CustomTripRequestCardDynamic
                              request={toCustomTripRequestListItem(request)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                {cancelledTripsSection}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
