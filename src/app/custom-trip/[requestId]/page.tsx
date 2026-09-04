import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Briefcase, CalendarDays, MapPin, MessageCircleHeart, Sparkles, Users, Wallet } from "lucide-react";

import { auth } from "@/lib/auth";
import { loadDb, prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomTripChatPanel } from "@/components/custom-trips/custom-trip-chat-panel";
import { DeleteCustomTripRequestButton } from "@/components/custom-trips/delete-custom-trip-request-button";
import {
  CUSTOM_TRIP_GROUP_LABELS,
  CUSTOM_TRIP_STATUS_LABELS,
  CUSTOM_TRIP_STATUS_STYLES,
  formatCustomTripDateRange,
  sportLabel,
  toCustomTripMessageViews,
} from "@/lib/custom-trips";

export const metadata: Metadata = {
  title: "Custom Trip — Radikal",
};

export const dynamic = "force-dynamic";
const MAX_MESSAGES = 100;

export default async function CustomTripRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/custom-trip/${requestId}`)}`);
  }

  const request = await loadDb(
    "custom-trip.request-detail",
    () =>
      prisma.customTripRequest.findFirst({
        where: { id: requestId, userId: session.user.id, deletedAt: null },
        include: { chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: MAX_MESSAGES } } } },
      }),
  );

  if (!request) {
    notFound();
  }

  const messages = request.chat
    ? toCustomTripMessageViews(request.chat.messages.slice().reverse(), session.user.id)
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit rounded-full border border-border/70 bg-background/80 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
          nativeButton={false}
          render={<Link href="/profile?tab=bookings" />}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to my bookings
        </Button>

        <div className="overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="h-1 bg-gradient-to-r from-orange-500 via-emerald-500 to-orange-400" />
          <div className="bg-gradient-to-br from-orange-50/80 via-white to-emerald-50/70 p-6 dark:from-orange-500/10 dark:via-card dark:to-emerald-500/10 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700 dark:text-orange-300">
                <Sparkles className="size-3.5" /> Your trip brief
              </p>
              <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {CUSTOM_TRIP_GROUP_LABELS[request.groupType] ?? request.groupType}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatCustomTripDateRange(request.startDate, request.endDate)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {request.status !== "CONFIRMED" ? (
                <DeleteCustomTripRequestButton requestId={request.id} />
              ) : null}
              <Badge
                className={cn(
                  "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest",
                  CUSTOM_TRIP_STATUS_STYLES[request.status] ?? CUSTOM_TRIP_STATUS_STYLES.NEW,
                )}
              >
                {CUSTOM_TRIP_STATUS_LABELS[request.status] ?? request.status}
              </Badge>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-white/75 p-4 dark:border-orange-500/15 dark:bg-card/50">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"><CalendarDays className="size-4" /></span>
              <div>
                <dt className="font-medium text-foreground">Dates</dt>
                <dd className="text-muted-foreground">
                  {formatCustomTripDateRange(request.startDate, request.endDate)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white/75 p-4 dark:border-emerald-500/15 dark:bg-card/50">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><MapPin className="size-4" /></span>
              <div>
                <dt className="font-medium text-foreground">Location</dt>
                <dd className="text-muted-foreground">{request.location}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white/75 p-4 dark:border-emerald-500/15 dark:bg-card/50">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Users className="size-4" /></span>
              <div>
                <dt className="font-medium text-foreground">Group size</dt>
                <dd className="text-muted-foreground">
                  {request.participantCount}{" "}
                  {request.participantCount === 1 ? "person" : "people"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-white/75 p-4 dark:border-orange-500/15 dark:bg-card/50">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"><Wallet className="size-4" /></span>
              <div>
                <dt className="font-medium text-foreground">Budget</dt>
                <dd className="text-muted-foreground">
                  {request.budgetRupees != null
                    ? `₹${request.budgetRupees.toLocaleString("en-IN")}`
                    : "Not specified"}
                </dd>
              </div>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {request.sports.map((sport) => (
              <Badge
                key={sport}
                variant="secondary"
                className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
              >
                {sportLabel(sport)}
              </Badge>
            ))}
            {request.sports.length === 0 ? (
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                <Briefcase className="h-3 w-3" />
                {CUSTOM_TRIP_GROUP_LABELS[request.groupType] ?? request.groupType}
              </Badge>
            ) : null}
          </div>

          {request.requirements ? (
            <div className="mt-6 rounded-[1.2rem] border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-500/15 dark:bg-emerald-500/5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
                Your requirements
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {request.requirements}
              </p>
            </div>
          ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_12px_32px_-18px_rgba(0,0,0,0.35)] sm:p-6">
          <div className="rounded-[1.5rem] bg-gradient-to-br from-orange-50 via-white to-emerald-50/70 px-5 py-4 dark:from-orange-500/10 dark:via-card dark:to-emerald-500/10">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300"><MessageCircleHeart className="size-4" /> Your planning conversation</p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-foreground">Let&apos;s shape the details together</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ask questions, share preferences and refine the itinerary with our team here.</p>
          </div>
          <div className="mt-4">
          <CustomTripChatPanel requestId={request.id} role="customer" messages={messages} />
          </div>
        </div>
      </section>
    </div>
  );
}
