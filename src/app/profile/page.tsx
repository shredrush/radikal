import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  AtSign,
  Bell,
  Camera,
  CalendarDays,
  ClipboardList,
  Compass,
  ExternalLink,
  Headset,
  KeyRound,
  MessageSquare,
  Settings2,
  Ticket,
  UserCog,
  Users,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Role } from "@/lib/authz";
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
import {
  CustomTripRequestCard,
  CustomTripRequestEmpty,
} from "@/components/custom-trips/custom-trip-request-card";
import { getTripCardImage } from "@/lib/trip-card-image";
import { formatTripDateRange } from "@/lib/trip-dates";
import {
  formatCancelledBy,
  toSupportMessageViews,
  countUnreadSupportMessages,
  type SupportMessageView,
} from "@/lib/support";
import { toCustomTripRequestListItem } from "@/lib/custom-trips";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { GuideTripsManager } from "@/components/guides/guide-trips-manager";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

/** Staff shortcuts shown on the profile page, filtered by the user's permissions. */
function staffNavItems(role: Role | undefined) {
  const items: { href: string; label: string; icon: React.ReactNode }[] = [];
  if (hasPermission(role, "support.manage")) {
    items.push({
      href: "/support",
      label: "Support dashboard",
      icon: <Headset className="h-3.5 w-3.5" />,
    });
  }
  if (hasPermission(role, "bookings.read")) {
    items.push({
      href: "/admin/bookings",
      label: "Manage bookings",
      icon: <Ticket className="h-3.5 w-3.5" />,
    });
  }
  if (hasPermission(role, "trips.manage")) {
    items.push({
      href: "/admin/trips",
      label: "Manage trips",
      icon: <Compass className="h-3.5 w-3.5" />,
    });
  }
  if (hasPermission(role, "guides.manage")) {
    items.push({
      href: "/admin/guides",
      label: "Manage guides",
      icon: <Users className="h-3.5 w-3.5" />,
    });
  }
  if (hasPermission(role, "guideApplications.manage")) {
    items.push({
      href: "/admin/guide-applications",
      label: "Guide Applications",
      icon: <ClipboardList className="h-3.5 w-3.5" />,
    });
  }
  if (hasPermission(role, "users.manage")) {
    items.push({
      href: "/admin/users",
      label: "Manage users",
      icon: <UserCog className="h-3.5 w-3.5" />,
    });
  }
  return items;
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
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { image: true, guide: { select: { slug: true, photo: true, photos: true } } },
  });
  const name = user.name ?? user.email ?? "User";
  const firstName = name.split(" ")[0];
  const profileInitials = getProfileInitials(name);
  const profileImage = currentUser?.guide ? getGuideImage(currentUser.guide) : currentUser?.image;

  const { tab, status, section } = await searchParams;
  const statusFilter =
    status === "PENDING" || status === "CONFIRMED" || status === "CANCELLED"
      ? status
      : null;
  const activeSection = section === "username" ? "username" : "password";
  const isGuide = user.role === "GUIDE";
  const guide = isGuide
    ? await prisma.guide.findUnique({
        where: { userId: user.id },
        select: { id: true, slug: true },
      })
    : null;
  const activeTab =
    tab === "settings"
      ? "settings"
      : tab === "support"
        ? "support"
        : tab === "notifications"
          ? "notifications"
          : isGuide && tab === "trips"
            ? "trips"
            : isGuide && tab === "booked-trips"
              ? "booked-trips"
              : "bookings";
  const canAccessSupportDesk = hasPermission(user.role, "support.manage");
  const canReadAllBookings = hasPermission(user.role, "bookings.read");
  const canConfirmBookings = hasPermission(user.role, "bookings.confirm");
  const canCancelBookings = hasPermission(user.role, "bookings.cancel");

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { trip: true, slot: true },
    orderBy: { createdAt: "desc" },
  });

  const customTripRequests = await prisma.customTripRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, username: true } },
      chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });

  const allBookings = canReadAllBookings
    ? await prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          trip: true,
          slot: true,
          user: { select: { id: true, name: true, username: true, email: true } },
          cancelledBy: { select: { name: true } },
        },
      })
    : [];

  const guideBookings = isGuide
    ? await prisma.booking.findMany({
        where: { trip: { guide: { userId: user.id } } },
        include: {
          trip: true,
          slot: true,
          user: { select: { id: true, name: true, username: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const visibleGuideBookings = statusFilter
    ? guideBookings.filter((b) => b.status === statusFilter)
    : guideBookings;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadNotificationsCount = notifications.filter((n) => !n.readAt).length;

  const now = new Date();
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const upcoming = confirmed.filter((b) => new Date(b.slot.date) >= now).length;

  let supportMessages: SupportMessageView[] = [];
  let supportChatStatus: "OPEN" | "CLOSED" = "OPEN";
  let supportUnreadCount = 0;
  if (!canAccessSupportDesk) {
    const supportChat = await prisma.supportChat.findUnique({
      where: { userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (supportChat) {
      supportChatStatus = supportChat.status;
      supportUnreadCount = countUnreadSupportMessages(supportChat, user.id);
      if (activeTab === "support") {
        supportMessages = toSupportMessageViews(supportChat.messages, user.id);
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
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
                    <strong className="font-semibold text-foreground">{bookings.length}</strong>{" "}
                    bookings
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <strong className="font-semibold text-foreground">{upcoming}</strong>{" "}
                    upcoming
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {staffNavItems(user.role).map((item) => (
                <Button
                  key={item.href}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-full sm:w-auto"
                  nativeButton={false}
                  render={<Link href={item.href} />}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
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
                                {notification.createdAt.toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
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
              <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                <CardHeader>
                  <CardTitle>All bookings</CardTitle>
                  <CardDescription>
                    A live view of every reservation across the platform.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {allBookings.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                      <Ticket className="h-8 w-8 text-muted-foreground/50" />
                      <div>
                        <p className="font-medium text-foreground">No bookings yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Reservations will appear here as soon as travellers book a trip.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {allBookings.map((booking) => (
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
                              cancelledByText: formatCancelledBy(
                                booking.cancelledBy?.name ?? null,
                                booking.cancelledByRole
                              ),
                              cancellationReason: booking.cancellationReason,
                              showAdminCancel: canCancelBookings,
                              showAdminConfirm: canConfirmBookings,
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-6">
                <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                  <CardHeader>
                    <CardTitle>Your bookings</CardTitle>
                    <CardDescription>
                      Every trip you&apos;ve reserved with Radikal, past and upcoming.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bookings.length === 0 ? (
                      <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                        <Ticket className="h-8 w-8 text-muted-foreground/50" />
                        <div>
                          <p className="font-medium text-foreground">No bookings yet</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Once you book a trip, it will show up here with its status.
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
                        {bookings.map((booking) => (
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
