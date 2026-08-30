import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Briefcase, CalendarDays, MapPin, Users, Wallet } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma, safeDb } from "@/lib/prisma";
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

  const request = await safeDb(
    "custom-trip.request-detail",
    () =>
      prisma.customTripRequest.findFirst({
        where: { id: requestId, userId: session.user.id, deletedAt: null },
        include: { chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: MAX_MESSAGES } } } },
      }),
    null,
  );

  if (!request) {
    notFound();
  }

  const messages = request.chat
    ? toCustomTripMessageViews(request.chat.messages.slice().reverse(), session.user.id)
    : [];

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit rounded-full"
          nativeButton={false}
          render={<Link href="/profile?tab=bookings" />}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to my bookings
        </Button>

        {/* Request summary */}
        <div className="rounded-[1.5rem] border border-border/80 bg-background/90 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Custom trip request
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

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="font-medium text-foreground">Dates</dt>
                <dd className="text-muted-foreground">
                  {formatCustomTripDateRange(request.startDate, request.endDate)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="font-medium text-foreground">Location</dt>
                <dd className="text-muted-foreground">{request.location}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="font-medium text-foreground">Group size</dt>
                <dd className="text-muted-foreground">
                  {request.participantCount}{" "}
                  {request.participantCount === 1 ? "person" : "people"}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
                className="rounded-full border border-border/70 bg-background/80 px-3 py-1"
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
            <div className="mt-6 rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Your requirements
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {request.requirements}
              </p>
            </div>
          ) : null}
        </div>

        {/* Chat */}
        <div className="rounded-[1.5rem] border border-border/80 bg-background/90 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Chat with our team
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Discuss details, ask questions and finalise your itinerary here.
          </p>
          <CustomTripChatPanel requestId={request.id} role="customer" messages={messages} />
        </div>
      </section>
    </div>
  );
}
