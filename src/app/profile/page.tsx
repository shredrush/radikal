import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  CalendarDays,
  Headset,
  LogOut,
  MessageSquare,
  Settings2,
  Ticket,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupportAgent as isSupportAgentRole } from "@/lib/authz";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { SupportChatPanel } from "@/components/support/support-chat-panel";
import { BookingCard } from "@/components/profile/booking-card";
import { getTripCardImage } from "@/lib/trip-card-image";
import { formatTripDateRange } from "@/lib/trip-dates";
import { toSupportMessageViews, countUnreadSupportMessages, type SupportMessageView } from "@/lib/support";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Profile — Radikal",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile");
  }

  const user = session.user;
  const name = user.name ?? "traveller";
  const firstName = name.split(" ")[0];
  const initial = (name.trim()[0] ?? "R").toUpperCase();

  const { tab } = await searchParams;
  const activeTab =
    tab === "settings" ? "settings" : tab === "support" ? "support" : "bookings";
  const isSupportAgent = isSupportAgentRole(user.role);

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { activity: true, slot: true },
    orderBy: { createdAt: "desc" },
  });

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
              {user.role === "ADMIN" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    nativeButton={false}
                    render={<Link href="/admin/bookings" />}
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    View bookings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    nativeButton={false}
                    render={<Link href="/admin/trips" />}
                  >
                    Manage trips
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    nativeButton={false}
                    render={<Link href="/admin/guides" />}
                  >
                    Manage guides
                  </Button>
                </>
              ) : null}
              {isSupportAgent ? (
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
              <form action={logoutAction}>
                <Button
                  variant="outline"
                  size="sm"
                  type="submit"
                  className="rounded-full text-muted-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log out
                </Button>
              </form>
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

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <nav className="flex gap-2 overflow-x-auto lg:flex-col">
              <Link
                href="/profile?tab=bookings"
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === "bookings"
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Ticket className="h-4 w-4" />
                Bookings
              </Link>
              <Link
                href="/profile?tab=settings"
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === "settings"
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Settings2 className="h-4 w-4" />
                Settings
              </Link>
              <Link
                href="/profile?tab=support"
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === "support"
                    ? "border-primary/30 bg-primary/5 text-foreground"
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
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            {activeTab === "settings" ? (
              <Card className="overflow-hidden rounded-[1.5rem] border-border/80 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
                <CardHeader>
                  <CardTitle>Change password</CardTitle>
                  <CardDescription>
                    Pick a strong password you don&apos;t use anywhere else.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChangePasswordForm />
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
