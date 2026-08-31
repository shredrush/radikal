import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, MessageCircle, Sparkles, WandSparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma, safeDb } from "@/lib/prisma";
import { ACCENT_PILL } from "@/lib/card-styles";
import {
  MAX_OPEN_CUSTOM_TRIP_CHATS,
  toCustomTripRequestListItem,
} from "@/lib/custom-trips";
import { CustomTripForm } from "@/components/custom-trips/custom-trip-form";
import { OpenCustomTripRequests } from "@/components/custom-trips/open-custom-trip-requests";

export const metadata: Metadata = {
  title: "Custom Trip — Radikal",
  description:
    "Design a private group or corporate adventure across the Himalayas. Pick your sports, dates and group size, and our team will build the trip for you.",
};

export const dynamic = "force-dynamic";

export default async function CustomTripPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/custom-trip")}`);
  }

  const openRequests = await safeDb(
    "custom-trip.open-requests",
    () =>
      prisma.customTripRequest.findMany({
        where: {
          userId: session.user.id,
          status: { notIn: ["CONFIRMED", "CANCELLED"] },
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, username: true } },
          chat: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } },
        },
      }),
    [],
  );
  const openRequestItems = openRequests.map(toCustomTripRequestListItem);
  const atChatLimit = openRequestItems.length >= MAX_OPEN_CUSTOM_TRIP_CHATS;

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)]">
          <div className="h-1 bg-gradient-to-r from-orange-500 via-emerald-500 to-orange-400" />
          <div className="bg-gradient-to-br from-orange-50/80 via-white to-emerald-50/70 p-6 dark:from-orange-500/10 dark:via-card dark:to-emerald-500/10 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4">
            <p className={`inline-flex w-fit items-center gap-1.5 rounded-full border ${ACCENT_PILL} px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.24em]`}>
              <Sparkles className="h-3.5 w-3.5" />
              Made around your crew
            </p>
            <h1 className="max-w-3xl font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              An adventure that starts with your idea.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Bring us the people, the place, or just the feeling you&apos;re chasing. Our local team will turn it into a private journey with the right guides, rhythm and details.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-orange-600 dark:text-orange-300" /> Built with local guides</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-300" /> Tailored to your pace</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-orange-600 dark:text-orange-300" /> No commitment to enquire</span>
            </div>
          </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <CustomTripForm atChatLimit={atChatLimit} />

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <OpenCustomTripRequests requests={openRequestItems} />

            <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-orange-50 via-white to-emerald-50/70 p-5 dark:from-orange-500/10 dark:via-card dark:to-emerald-500/10">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                <WandSparkles className="size-5" />
              </div>
              <h2 className="mt-4 font-heading text-xl font-semibold text-foreground">
                From idea to trail
              </h2>
              <ol className="mt-4 flex flex-col gap-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                    1
                  </span>
                  Share the essentials in your own words.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    2
                  </span>
                  A trip specialist opens a chat to refine the good bits.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                    3
                  </span>
                  Receive your route, inclusions and a considered quote.
                </li>
              </ol>
              <div className="mt-5 flex items-start gap-2 border-t border-emerald-100 pt-4 text-xs leading-5 text-muted-foreground dark:border-emerald-500/15">
                <MessageCircle className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                Your request begins a conversation, not a booking.
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
