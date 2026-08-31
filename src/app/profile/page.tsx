import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  AtSign,
  Bell,
  Camera,
  CalendarDays,
  ExternalLink,
  Headset,
  Heart,
  KeyRound,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Phone,
  Settings2,
  Ticket,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma, safeDb } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getProfileUser } from "@/lib/profile-user";
import { getProfileSummary, type ProfileSummary } from "@/lib/profile-summary";
import { getAdminBoardHref } from "@/lib/admin-sections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfileInitials } from "@/lib/profile-initials";
import { getGuideImage } from "@/lib/guide-images";
import { LogoutButton } from "@/components/profile/logout-button";
import { LazyBookingsSection } from "@/components/profile/lazy-bookings-section";
import { LazyCustomTripsSection } from "@/components/profile/lazy-custom-trips-section";
import { WishlistCard } from "@/components/profile/wishlist-card";
import { NotificationItem } from "@/components/profile/notification-item";
import { SupportChatPanel } from "@/components/support/support-chat-panel";
import { LazyProfilePhotoForm } from "@/components/profile/lazy-profile-photo-form";
import { ChangeUsernameForm } from "@/components/profile/change-username-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { ChangeEmailForm } from "@/components/profile/change-email-form";
import { ChangePhoneForm } from "@/components/profile/change-phone-form";
import {
  toSupportMessageViews,
  type SupportMessageView,
} from "@/lib/support";
import { formatDateTime } from "@/lib/format";
import {
  clearAllNotificationsAction,
  markAllNotificationsReadAction,
} from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
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
  const activeSection =
    section === "username"
      ? "username"
      : section === "email"
        ? "email"
        : section === "phone"
          ? "phone"
          : "password";
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
  const adminBoardHref = getAdminBoardHref(user.role);

  // Keep the first profile response light. Full tab lists lazy-load via API
  // endpoints after user interaction, so the route can stream an interactive
  // shell without waiting on booking/custom-trip/review queries.
  const [
    currentUser,
    guide,
    wishlistItems,
    notifications,
    supportChat,
    profileSummary,
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
    activeTab === "wishlist"
      ? safeDb(
          "profile.wishlist",
          () =>
            prisma.wishlistItem.findMany({
              where: { userId: user.id, deletedAt: null, trip: { deletedAt: null } },
              orderBy: { createdAt: "desc" },
              take: 20,
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
    // Full notification content is only loaded when the tab is open. The
    // sidebar count is served by the cached profile summary below.
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
      : Promise.resolve([]),
    !canAccessSupportDesk && activeTab === "support"
      ? safeDb(
          "profile.support-chat",
          () =>
            prisma.supportChat.findUnique({
              where: { userId: user.id, deletedAt: null },
              include: { messages: { orderBy: { createdAt: "desc" }, take: 100 } },
            }),
          null,
        )
      : Promise.resolve(null),
    safeDb(
      "profile.summary",
      () => getProfileSummary(user.id),
      {
        unreadNotifications: 0,
        bookingTotal: 0,
        upcomingBookings: 0,
        supportUnread: 0,
      } satisfies ProfileSummary,
    ),
  ]);

  const profileImage = currentUser?.guide
    ? getGuideImage({
        username: currentUser.guide.user?.username ?? "",
        photo: currentUser.guide.photo,
        photos: currentUser.guide.photos,
      })
    : currentUser?.image;

  // Prefer the live DB values over the JWT so the settings forms stay accurate
  // even right after an email/phone change in the same session.
  const currentEmail = currentUser?.email ?? user.email ?? "";
  const currentPhone = currentUser?.phone ?? null;

  const notificationList = notifications;
  const unreadNotificationsCount =
    activeTab === "notifications"
      ? notifications.filter((notification) => !notification.readAt).length
      : profileSummary.unreadNotifications;

  const heroBookingCount = profileSummary.bookingTotal;
  const heroUpcomingCount = profileSummary.upcomingBookings;

  let supportMessages: SupportMessageView[] = [];
  const supportChatStatus: "OPEN" | "CLOSED" = supportChat?.status === "CLOSED" ? "CLOSED" : "OPEN";
  const supportUnreadCount = canAccessSupportDesk ? 0 : profileSummary.supportUnread;
  if (!canAccessSupportDesk && supportChat) {
    supportMessages = toSupportMessageViews(supportChat.messages.slice().reverse(), user.id);
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        {/* Hero */}
        <div className="rounded-[1.5rem] border border-border/80 p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="-my-5 -ml-5 flex w-44 shrink-0 flex-col items-center gap-1.5 sm:-my-6 sm:-ml-6 sm:w-56 sm:self-stretch">
                <LazyProfilePhotoForm
                  currentImage={currentUser?.image ?? null}
                  userId={user.id}
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
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  {user.username ? (
                    <>
                      <p className="truncate">@{user.username}</p>
                      <p className="truncate">{user.email}</p>
                    </>
                  ) : (
                    <p className="truncate">{user.email}</p>
                  )}
                </div>
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
                  render={<Link href="/guide-board/trips" />}
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
                prefetch={false}
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
                prefetch={false}
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
                prefetch={false}
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
                prefetch={false}
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
                prefetch={false}
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
                  prefetch={false}
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
                  prefetch={false}
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
                <Link
                  href="/profile?tab=settings&section=email"
                  prefetch={false}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                    activeSection === "email"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <Mail className="h-4 w-4" />
                  Change email
                </Link>
                <Link
                  href="/profile?tab=settings&section=phone"
                  prefetch={false}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                    activeSection === "phone"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <Phone className="h-4 w-4" />
                  Change phone
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
                    {activeSection === "username"
                      ? "Change username"
                      : activeSection === "email"
                        ? "Change email"
                        : activeSection === "phone"
                          ? "Change phone number"
                          : "Change password"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeSection === "username" ? (
                    <ChangeUsernameForm currentUsername={user.username ?? null} />
                  ) : activeSection === "email" ? (
                    <ChangeEmailForm currentEmail={currentEmail} />
                  ) : activeSection === "phone" ? (
                    <ChangePhoneForm currentPhone={currentPhone} />
                  ) : (
                    <ChangePasswordForm />
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
                    <div className="flex items-center gap-2">
                      {unreadNotificationsCount > 0 ? (
                        <form action={markAllNotificationsReadAction}>
                          <Button type="submit" variant="outline" size="sm" className="rounded-full">
                            Mark all read
                          </Button>
                        </form>
                      ) : null}
                      {notificationList.length > 0 ? (
                        <form action={clearAllNotificationsAction}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="rounded-full text-destructive hover:text-destructive"
                          >
                            Clear all
                          </Button>
                        </form>
                      ) : null}
                    </div>
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
                        <NotificationItem
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
                    <SupportChatPanel messages={supportMessages} status={supportChatStatus} />
                  </CardContent>
                </Card>
              )
            ) : activeTab === "bookings" ? (
              <div className="flex flex-col gap-6">
                <LazyBookingsSection
                  kind="upcoming"
                  title="Upcoming trips"
                  endpoint="/api/profile/bookings?kind=upcoming"
                  emptyTitle="No upcoming trips"
                  emptyDescription="Once you book a trip, it will show up here with its status."
                  defaultOpen={!canReadAllBookings}
                />

                <LazyBookingsSection
                  kind="completed"
                  title="Completed trips"
                  description="Trips you've already finished with Radikal."
                  endpoint="/api/profile/bookings?kind=completed"
                  emptyTitle="No completed trips yet"
                  emptyDescription="Trips you finish will appear here once their dates have passed."
                />

                <LazyBookingsSection
                  kind="cancelled"
                  title="Cancelled trips"
                  description="Trips you've cancelled or that were cancelled before they started."
                  endpoint="/api/profile/bookings?kind=cancelled"
                  emptyTitle="No cancelled trips"
                  emptyDescription="Trips you cancel will appear here so you can still see the details."
                />
                {!canReadAllBookings ? <LazyCustomTripsSection /> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
