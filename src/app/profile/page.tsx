import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  AtSign,
  Bell,
  CalendarDays,
  ClipboardList,
  Compass,
  ExternalLink,
  Headset,
  KeyRound,
  MessageSquare,
  Settings2,
  Ticket,
  Users,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupportAgent as isSupportAgentRole, isAdmin } from "@/lib/authz";
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
import { LogoutButton } from "@/components/profile/logout-button";
import { SupportChatPanel } from "@/components/support/support-chat-panel";
import { BookingCard } from "@/components/profile/booking-card";
import { getTripCardImage } from "@/lib/trip-card-image";
import { formatTripDateRange } from "@/lib/trip-dates";
import {
  formatCancelledBy,
  toSupportMessageViews,
  countUnreadSupportMessages,
  type SupportMessageView,
} from "@/lib/support";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

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
  const name = user.name ?? "traveller";
  const firstName = name.split(" ")[0];
  const initial = (name.trim()[0] ?? "R").toUpperCase();

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
        select: { slug: true },
      })
    : null;
  const activeTab =
    tab === "settings"
      ? "settings"
      : tab === "support"
        ? "support"
        : tab === "notifications"
          ? "notifications"
          : isGuide && tab === "booked-trips"
            ? "booked-trips"
            : "bookings";
  const isSupportAgent = isSupportAgentRole(user.role);
  const isAdminUser = isAdmin(user.role);

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { activity: true, slot: true },
    orderBy: { createdAt: "desc" },
  });

  const allBookings = isAdminUser
    ? await prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          activity: true,
          slot: true,
          user: { select: { id: true, name: true, username: true, email: true } },
          cancelledBy: { select: { name: true } },
        },
      })
    : [];

  const guideBookings = isGuide
    ? await prisma.booking.findMany({
        where: { activity: { guide: { userId: user.id } } },
        include: {
          activity: true,
          slot: true,
          user: { select: { id: true, name: true, username: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const visibleGuideBookings = statusFilter
    ? guideBookings.filter((b) => b.status === statusFilter)
    : guideBookings;

  const now = new Date();
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const upcoming = confirmed.filter((b) => new Date(b.slot.date) >= now).length;

  let supportMessages: SupportMessageView[] = [];
  let supportChatStatus: "OPEN" | "CLOSED" = "OPEN";
  let supportUnreadCount = 0;
  if (!isSupportAgent) {
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
    <div className="flex flex-1 flex-col bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.08),_transparent_30%)]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        {/* Hero */}
        <div className="rounded-[1.5rem] border border-border/80 bg-background/90 p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl object-cover ring-1 ring-border/70"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#3a3a3a] to-[#5a5a5a] font-heading text-xl font-semibold text-white">
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  Profile
                </p>
                <h1 className="truncate font-heading text-lg font-semibold tracking-wide sm:text-xl">
                  Welcome back, {firstName}
                </h1>
                <p className="truncate text-sm text-muted-foreground">
                  {user.username ? `@${user.username}` : user.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isAdmin(user.role) ? (
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start rounded-full"
                      nativeButton={false}
                      render={<Link href="/support" />}
                    >
                      <Headset className="h-3.5 w-3.5" />
                      Support dashboard
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start rounded-full"
                      nativeButton={false}
                      render={<Link href="/admin/guide-registrations" />}
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Guide Applications
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start rounded-full"
                      nativeButton={false}
                      render={<Link href="/admin/bookings" />}
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      Manage bookings
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start rounded-full"
                      nativeButton={false}
                      render={<Link href="/admin/trips" />}
                    >
                      <Compass className="h-3.5 w-3.5" />
                      Manage trips
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start rounded-full"
                      nativeButton={false}
                      render={<Link href="/admin/guides" />}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Manage guides
                    </Button>
                  </div>
                </div>
              ) : isSupportAgent ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  nativeButton={false}
                  render={<Link href="/support" />}
                >
                  <Headset className="h-3.5 w-3.5" />
                  Support dashboard
                </Button>
              ) : null}
              {isGuide ? (
                <>
                  {guide ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                      nativeButton={false}
                      render={<Link href={`/${guide.slug}`} />}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View public profile
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10"
                    nativeButton={false}
                    render={<Link href="/profile?tab=booked-trips" />}
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Bookings with you
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-sm text-muted-foreground">
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

        <div
          className={cn(
            "grid gap-6",
            activeTab === "settings"
              ? "lg:grid-cols-[220px_200px_1fr]"
              : "lg:grid-cols-[220px_1fr]"
          )}
        >
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <nav className="flex gap-2 overflow-x-auto lg:flex-col">
              {isGuide ? (
                <Link
                  href="/profile?tab=booked-trips"
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                    activeTab === "booked-trips"
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <ClipboardList className="h-4 w-4" />
                  Bookings with you
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
                    "flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
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
                    "flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-colors",
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
                  <CardDescription>
                    {activeSection === "username"
                      ? "Update the public handle shown across your profile."
                      : "Pick a strong password you don&apos;t use anywhere else."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeSection === "username" ? (
                    <ChangeUsernameForm currentUsername={user.username ?? null} />
                  ) : (
                    <ChangePasswordForm />
                  )}
                </CardContent>
              </Card>
            ) : activeTab === "notifications" ? (
              <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Updates about your bookings, trips, and account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/50" />
                    <div>
                      <p className="font-medium text-foreground">No notifications yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        When something important happens, it will show up here.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : activeTab === "support" ? (
              isSupportAgent ? (
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
                  <CardTitle>Bookings with you</CardTitle>
                  <CardDescription>
                    Trips travellers have reserved with you as their guide.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {guideBookings.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 rounded-[1.2rem] border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
                      <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
                      <div>
                        <p className="font-medium text-foreground">No bookings with you yet</p>
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
                                  tripSlug: booking.activity.slug,
                                  title: booking.activity.title,
                                  location: booking.activity.location,
                                  image: getTripCardImage(booking.activity),
                                  dateRange: formatTripDateRange(
                                    booking.slot.date,
                                    booking.activity.durationDays
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
            ) : isAdminUser ? (
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
                              tripSlug: booking.activity.slug,
                              title: booking.activity.title,
                              location: booking.activity.location,
                              image: getTripCardImage(booking.activity),
                              dateRange: formatTripDateRange(
                                booking.slot.date,
                                booking.activity.durationDays
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
                              showAdminCancel: true,
                              showAdminConfirm: true,
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : (
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
                              tripSlug: booking.activity.slug,
                              title: booking.activity.title,
                              location: booking.activity.location,
                              image: getTripCardImage(booking.activity),
                              dateRange: formatTripDateRange(
                                booking.slot.date,
                                booking.activity.durationDays
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
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
