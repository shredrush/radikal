import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const openRequests = await prisma.customTripRequest.findMany({
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
  });
  const openRequestItems = openRequests.map(toCustomTripRequestListItem);
  const atChatLimit = openRequestItems.length >= MAX_OPEN_CUSTOM_TRIP_CHATS;

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        {/* Hero */}
        <div className="rounded-[1.5rem] border border-border/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)] sm:p-8">
          <div className="flex flex-col gap-3">
            <p className={`inline-flex w-fit items-center gap-1.5 rounded-full border ${ACCENT_PILL} px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.24em]`}>
              <Sparkles className="h-3.5 w-3.5" />
              Bespoke trips
            </p>
            <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
              Your adventure, your dates, your people.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Planning a private group or corporate retreat? Tell us the sports you want, your
              preferred dates and group size, and our team will craft a custom itinerary with a
              tailored quote.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <CustomTripForm atChatLimit={atChatLimit} />

          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <OpenCustomTripRequests requests={openRequestItems} />

            <div className="rounded-[1.5rem] border border-border/80 bg-muted/20 p-5">
              <h2 className="font-heading text-base font-semibold text-foreground">
                How it works
              </h2>
              <ol className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                    1
                  </span>
                  Share your requirements — sports, dates, group size and budget.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    2
                  </span>
                  Our team reviews it and opens a chat with you to refine the plan.
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                    3
                  </span>
                  You get a tailored itinerary and a quote, and confirm once you&apos;re happy.
                </li>
              </ol>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
