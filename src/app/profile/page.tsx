import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  AtSign,
  Bell,
  Camera,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Compass,
  ExternalLink,
  Headset,
  Heart,
  KeyRound,
  ListChecks,
  MessageSquare,
  Settings2,
  Ticket,
  UserCog,
  Users,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Role } from "@/lib/authz";
import { ADMIN_SECTIONS, type AdminSection } from "@/lib/admin-sections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { ChangeUsernameForm } from "@/components/profile/change-username-form";
import { ProfilePhotoForm } from "@/components/profile/profile-photo-form";
import { getProfileInitials } from "@/lib/profile-initials";
import { getGuideImage } from "@/lib/guide-images";
import { LogoutButton } from "@/components/profile/logout-button";
import { SupportChatPanel } from "@/components/support/support-chat-panel";
import { BookingCard } from "@/components/profile/booking-card";
import { LazyBookingsSection } from "@/components/profile/lazy-bookings-section";
import { WishlistCard } from "@/components/profile/wishlist-card";
import {
  CustomTripRequestCard,
  CustomTripRequestEmpty,
} from "@/components/custom-trips/custom-trip-request-card";
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
import { GuideTripsManager } from "@/components/guides/guide-trips-manager";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "COMPLETED", label: "Completed" },
] as const;

/** Icons for the admin sections on the profile page (the admin board header
 *  renders the same sections without icons). */
const STAFF_SECTION_ICONS: Record<AdminSection, React.ReactNode> = {
  "trip-changes": <ListChecks className="h-3.5 w-3.5" />,
  trips: <Compass className="h-3.5 w-3.5" />,
  bookings: <Ticket className="h-3.5 w-3.5" />,
  guides: <Users className="h-3.5 w-3.5" />,
  applications: <ClipboardList className="h-3.5 w-3.5" />,
  users: <UserCog className="h-3.5 w-3.5" />,
};

/**
 * Staff shortcuts shown on the profile page. The section list (order, labels,
 * hrefs, and permission gating) is shared with the admin board header via
 * `ADMIN_SECTIONS` so both stay in sync from a single source. The support
 * dashboard shortcut is rendered separately (top-right of the hero), mirroring
 * the admin board header layout.
 *
 * Buttons are grouped into columns so related sub-sections sit directly below
 * their parent: "Trip changes" under "Manage trips" and "Guide Applications"
 * under "Manage guides".
 */
const STAFF_BUTTON_GROUPS: { parent: AdminSection; children?: AdminSection[] }[] = [
  { parent: "trips", children: ["trip-changes"] },
  { parent: "bookings" },
  { parent: "guides", children: ["applications"] },
  { parent: "users" },
];

function staffButton(role: Role | undefined, key: AdminSection) {
  const section = ADMIN_SECTIONS.find((s) => s.key === key);
  if (!section || !hasPermission(role, section.permission)) {
    return null;
  }
  return {
    key: section.key,
    href: section.href,
    label: section.label,
    icon: STAFF_SECTION_ICONS[section.key],
  };
}

export const metadata: Metadata = {
  title: "Profile — Radikal",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; section?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }

  const user = session.user;
  const name = user.name ?? user.email ?? "User";
  const firstName = name.split(" ")[0];
  const profileInitials = getProfileInitials(name);

  const { tab, status, section } = await searchParams;
  const statusFilter =
    status === "PENDING" ||
    status === "CONFIRMED" ||
    status === "CANCELLED" ||
    status === "COMPLETED"
      ? status
      : null;
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
            : isGuide && tab === "trips"
            ? "trips"
            : isGuide && tab === "booked-trips"
              ? "booked-trips"
              : "bookings";
  const canAccessSupportDesk = hasPermission(user.role, "support.manage");
  const canReadAllBookings = hasPermission(user.role, "bookings.read");
  const isStaffView = canReadAllBookings;

  // Persist past CONFIRMED bookings as COMPLETED so the sections below render
  // the true state (no background scheduler exists in this app).
  await completePastBookings();

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
    guideBookings,
    notifications,
    userReviews,
    supportChat,
    supportUnread,
    personalBookingCounts,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { image: true, guide: { select: { slug: true, photo: true, photos: true } } },
    }),
    isGuide
      ? prisma.guide.findUnique({
          where: { userId: user.id },
          select: { id: true, slug: true },
        })
      : Promise.resolve(null),
    isStaffView
      ? Promise.resolve([])
      : prisma.booking.findMany({
          where: { userId: user.id },
          include: { trip: true, slot: true },
          orderBy: { createdAt: "desc" },
        }),
    activeTab === "wishlist"
      ? prisma.wishlistItem.findMany({
          where: { userId: user.id },
          include: { trip: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    activeTab === "bookings" && !canReadAllBookings
      ? prisma.customTripRequest.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, email: true, username: true } },
            chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
          },
        })
      : Promise.resolve([]),
    isGuide && activeTab === "booked-trips"
      ? prisma.booking.findMany({
          where: { trip: { guide: { userId: user.id } } },
          include: {
            trip: true,
            slot: true,
            user: { select: { id: true, name: true, username: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    activeTab === "bookings" && !isStaffView
      ? prisma.review.findMany({
          where: { userId: user.id },
          select: { id: true, tripId: true, rating: true, comment: true },
        })
      : Promise.resolve([]),
    !canAccessSupportDesk && activeTab === "support"
      ? prisma.supportChat.findUnique({
          where: { userId: user.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : Promise.resolve(null),
    !canAccessSupportDesk
      ? (async () => {
          const chat = await prisma.supportChat.findUnique({
            where: { userId: user.id },
            select: { id: true, status: true, createdAt: true, customerLastReadAt: true },
          });
          if (!chat) {
            return { status: "OPEN" as const, unreadCount: 0 };
          }
          const unreadCount = await prisma.supportMessage.count({
            where: {
              chatId: chat.id,
              senderId: { not: user.id },
              createdAt: { gt: chat.customerLastReadAt ?? chat.createdAt },
            },
          });
          return { status: chat.status, unreadCount };
        })()
      : Promise.resolve(null),
    isStaffView
      ? (async () => {
          const [total, confirmed] = await Promise.all([
            prisma.booking.count({ where: { userId: user.id } }),
            prisma.booking.count({ where: { userId: user.id, status: "CONFIRMED" } }),
          ]);
          return { total, upcoming: confirmed };
        })()
      : Promise.resolve(null),
  ]);

  const profileImage = currentUser?.guide ? getGuideImage(currentUser.guide) : currentUser?.image;

  const visibleGuideBookings = statusFilter
    ? guideBookings.filter((b) => b.status === statusFilter)
    : guideBookings;

  const unreadNotificationsCount = notifications.filter((n) => !n.readAt).length;

  const upcoming = bookings.filter((b) => b.status === "CONFIRMED").length;
  const heroBookingCount = isStaffView ? (personalBookingCounts?.total ?? 0) : bookings.length;
  const heroUpcomingCount = isStaffView ? (personalBookingCounts?.upcoming ?? 0) : upcoming;

  // Completion is persisted (lib/booking-completion.ts runs before the reads
  // above), so the DB status is the single source of truth for completed vs
  // active.
  const completedBookings = bookings.filter((booking) => booking.status === "COMPLETED");

  // Completed trips get their own section, so keep them out of the main
  // "Your bookings" list to avoid showing each finished trip twice.
  const activeBookings = bookings.filter((booking) => booking.status !== "COMPLETED");

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
  const supportChatStatus: "OPEN" | "CLOSED" = supportUnread?.status ?? "OPEN";
  const supportUnreadCount = supportUnread?.unreadCount ?? 0;
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
                <BookingCard
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
                    render={<Link href={`/${guide.slug}`} />}
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
              {canAccessSupportDesk ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-full sm:w-auto"
                  nativeButton={false}
                  render={<Link href="/support" />}
                >
                  <Headset className="h-3.5 w-3.5" />
                  Support dashboard
                </Button>
              ) : null}
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                {STAFF_BUTTON_GROUPS.map((group) => {
                  const parent = staffButton(user.role, group.parent);
                  if (!parent) return null;
                  const children = (group.children ?? [])
                    .map((key) => staffButton(user.role, key))
                    .filter((b): b is NonNullable<ReturnType<typeof staffButton>> => b !== null);
                  return (
                    <div key={group.parent} className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        nativeButton={false}
                        render={<Link href={parent.href} />}
                      >
                        {parent.icon}
                        {parent.label}
                      </Button>
                      {children.map((child) => (
                        <Button
                          key={child.key}
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          nativeButton={false}
                          render={<Link href={child.href} />}
                        >
                          {child.icon}
                          {child.label}
                        </Button>
                      ))}
                    </div>
                  );
                })}
              </div>
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
              {isGuide ? (
                <Link
                  href="/profile?tab=trips"
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                    activeTab === "trips"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <Compass className="h-4 w-4" />
                  My trips
                </Link>
              ) : null}
              {isGuide ? (
                <Link
                  href="/profile?tab=booked-trips"
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                    activeTab === "booked-trips"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <ClipboardList className="h-4 w-4" />
                  My Bookings
                </Link>
              ) : null}
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
                    <ChangeUsernameForm currentUsername={user.username ?? null} />
                  ) : (
                    <ChangePasswordForm />
                  )}
                </CardContent>
              </Card>
            ) : activeTab === "trips" ? (
              <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                <CardHeader>
                  <CardTitle>My trips</CardTitle>
                  <CardDescription>
                    Add or edit the trips you lead. Changes go live after our team reviews them.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {guide ? (
                    <GuideTripsManager guideId={guide.id} />
                  ) : (
                    <p className="text-sm text-muted-foreground">No guide profile linked to this account.</p>
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
                          <WishlistCard trip={item.trip} />
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
                  {notifications.length === 0 ? (
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
                      {notifications.map((notification) => (
                        <li
                          key={notification.id}
                          className={cn(
                            "rounded-[1.2rem] border px-4 py-3",
                            notification.readAt
                              ? "border-border/70 bg-background/60"
                              : "border-primary/30 bg-primary/5"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</p>
                              <p className="mt-2 text-xs text-muted-foreground/70">
                                {formatDateTime(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.readAt ? (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            ) : null}
                          </div>
                          {notification.href ? (
                            <Link
                              href={notification.href}
                              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : activeTab === "support" ? (
              canAccessSupportDesk ? (
                <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                  <CardHeader>
                    <CardTitle>Support dashboard</CardTitle>
                    <CardDescription>
                      Review and reply to customer conversations from the support desk.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-start gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 p-6">
                      <Headset className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Open the support dashboard to see open chats and reply to customers.
                      </p>
                      <Button
                        size="sm"
                        className="rounded-full"
                        nativeButton={false}
                        render={<Link href="/support" />}
                      >
                        <Headset className="h-3.5 w-3.5" />
                        Open support dashboard
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
                    <SupportChatPanel messages={supportMessages} status={supportChatStatus} />
                  </CardContent>
                </Card>
              )
            ) : activeTab === "booked-trips" ? (
              <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                <CardHeader>
                  <CardTitle>My Bookings</CardTitle>
                  <CardDescription>
                    Trips travellers have reserved with you as their guide.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {guideBookings.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                      <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                      <div>
                        <p className="font-medium text-foreground">No bookings yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          When travellers reserve one of your trips, it will show up here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        {STATUS_FILTERS.map(({ value, label }) => {
                          const active = (statusFilter ?? "ALL") === value;
                          const count =
                            value === "ALL"
                              ? guideBookings.length
                              : guideBookings.filter((b) => b.status === value).length;
                          return (
                            <Button
                              key={value}
                              size="sm"
                              variant={active ? "default" : "outline"}
                              className="rounded-full"
                              nativeButton={false}
                              render={
                                <Link
                                  href={
                                    value === "ALL"
                                      ? "/profile?tab=booked-trips"
                                      : `/profile?tab=booked-trips&status=${value}`
                                  }
                                />
                              }
                            >
                              {label}
                              <span className="ml-1 text-[0.65rem] opacity-70">({count})</span>
                            </Button>
                          );
                        })}
                      </div>
                      {visibleGuideBookings.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                          <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            No bookings match this filter.
                          </p>
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {visibleGuideBookings.map((booking) => (
                            <li key={booking.id}>
                              <BookingCard
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
                                  customer: {
                                    name: booking.user.name,
                                    username: booking.user.username,
                                    email: booking.user.email,
                                  },
                                  cancellationReason: booking.cancellationReason,
                                  showGuideCancel: true,
                                }}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : canReadAllBookings ? (
              <div className="flex flex-col gap-6">
                <LazyBookingsSection
                  kind="upcoming"
                  title="Upcoming trips"
                  endpoint="/api/profile/bookings?kind=upcoming"
                  emptyTitle="No upcoming trips"
                  emptyDescription="Once you book a trip, it will show up here with its status."
                />

                <LazyBookingsSection
                  kind="completed"
                  title="Completed trips"
                  description="Trips you've already finished with Radikal."
                  endpoint="/api/profile/bookings?kind=completed"
                  emptyTitle="No completed trips yet"
                  emptyDescription="Trips you finish will appear here once their dates have passed."
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
                              : "Your finished trips are listed in the Completed trips section."}
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
                            <BookingCard
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
                      <CustomTripRequestEmpty />
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {customTripRequests.map((request) => (
                          <li key={request.id}>
                            <CustomTripRequestCard
                              request={toCustomTripRequestListItem(request)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
