import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3, Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma, safeDb } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuideApplicationForm } from "@/components/guides/guide-application-form";
import { formatLongDate } from "@/lib/format";
import { ACCENT_PILL, ACCENT_PILL_EMERALD } from "@/lib/card-styles";

export const metadata: Metadata = {
  title: "Become a Guide — Radikal",
};

export const dynamic = "force-dynamic";

export default async function BecomeAGuidePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/become-a-guide");
  }

  const user = session.user;

  // Read the account's role and guide linkage from the database (not the
  // possibly-stale JWT) so a demotion or guide removal takes effect
  // immediately instead of leaving the "already a guide" wall up.
  const account = await safeDb(
    "become-a-guide.account",
    () =>
      prisma.user.findFirst({
        where: { id: user.id, deletedAt: null },
        select: { role: true, username: true, guide: { select: { id: true, deletedAt: true } } },
      }),
    null,
  );
  if (!account) {
    redirect("/login?callbackUrl=/become-a-guide");
  }

  // The linked guide profile is the ground truth — a GUIDE role without one is
  // an orphan that must be allowed to re-apply.
  const isAlreadyGuide = !!account.guide && !account.guide.deletedAt;

  const application = isAlreadyGuide
    ? null
    : await safeDb(
        "become-a-guide.application",
        () =>
          prisma.guideApplication.findFirst({
            where: { userId: user.id },
            orderBy: { submittedAt: "desc" },
          }),
        null,
      );

  const pendingApplication =
    application?.status === "PENDING" ? application : null;
  const lastApplicationStatus = application?.status;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <header className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-orange-50/80 via-white to-emerald-50/60 p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] dark:from-orange-500/10 dark:via-card dark:to-emerald-500/10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-emerald-500 to-orange-400" />
          <div className={`inline-flex items-center gap-2 rounded-full border ${ACCENT_PILL} px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]`}>
            <Sparkles className="size-3.5" />
            Guide programme
          </div>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
            Become a Radikal guide
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            Lead small-group Himalayan adventures and share your local knowledge. Tell us about
            yourself, your experience, and how travellers can reach you — our team reviews every
            application before you go live.
          </p>
        </header>

        {isAlreadyGuide ? (
          <Card className="relative overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-card dark:to-card">
            <div className="h-1 bg-emerald-500" />
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle2 className="size-8" />
              </span>
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold tracking-wide">You&apos;re already a guide</h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Your account is registered as a guide. Head to your profile to manage your trips
                  and bookings.
                </p>
              </div>
              <Button className="rounded-full" nativeButton={false} render={<Link href="/profile" />}>
                Go to profile
              </Button>
            </CardContent>
          </Card>
        ) : pendingApplication ? (
          <Card className="relative overflow-hidden border-orange-200 bg-gradient-to-br from-orange-50/80 via-white to-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] dark:border-orange-500/20 dark:from-orange-500/10 dark:via-card dark:to-card">
            <div className="h-1 bg-orange-500" />
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <span className="rounded-2xl bg-orange-100 p-3 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                <Clock3 className="size-8" />
              </span>
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold tracking-wide">Application under review</h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Your application was submitted on{" "}
                  {formatLongDate(pendingApplication.submittedAt)}
                  . Our team will review it shortly.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-orange-200 bg-gradient-to-br from-orange-50/80 via-white to-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] dark:border-orange-500/20 dark:from-orange-500/10 dark:via-card dark:to-card">
            <div className="h-1 bg-gradient-to-r from-orange-500 via-emerald-500 to-orange-400" />
            <CardHeader className="border-b border-orange-100 bg-orange-50/40 dark:border-orange-500/15 dark:bg-orange-500/5">
              <div className={`mb-1 inline-flex w-fit items-center gap-2 rounded-full border ${ACCENT_PILL_EMERALD} px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]`}>
                Your next adventure
              </div>
              <CardTitle className="text-xl">Your application</CardTitle>
              <CardDescription>
                {lastApplicationStatus === "REJECTED" ? (
                  "Your previous application was not approved. You can apply again below."
                ) : lastApplicationStatus === "APPROVED" ? (
                  "Your previous guide profile is no longer active. Submit a new application below."
                ) : (
                  "Fill in the details below. Fields marked as optional can be skipped."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <GuideApplicationForm
                fullName={user.name}
                username={account.username}
                userId={user.id}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
