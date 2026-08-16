import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuideApplicationForm } from "@/components/guides/guide-application-form";

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
  const isAlreadyGuide = user.role === "GUIDE";

  const application = isAlreadyGuide
    ? null
    : await prisma.guideApplication.findFirst({
        where: { userId: user.id },
        orderBy: { submittedAt: "desc" },
      });

  const pendingApplication =
    application?.status === "PENDING" ? application : null;
  const approvedApplication =
    application?.status === "APPROVED" ? application : null;

  return (
    <div className="min-h-screen bg-app-gradient">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <header className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Guide programme</p>
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
          <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <CheckCircle2 className="size-10 text-primary" />
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
          <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <Clock3 className="size-10 text-muted-foreground" />
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold tracking-wide">Application under review</h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Your application was submitted on{" "}
                  {pendingApplication.submittedAt.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  . Our team will review it shortly.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : approvedApplication ? (
          <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <CheckCircle2 className="size-10 text-primary" />
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold tracking-wide">Application approved</h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Great news — your application has been approved. Sign out and back in if your guide
                  profile isn&apos;t showing yet.
                </p>
              </div>
              <Button className="rounded-full" nativeButton={false} render={<Link href="/community" />}>
                View community
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <CardHeader className="border-b border-border/70 bg-muted/20">
              <CardTitle className="text-xl">Your application</CardTitle>
              <CardDescription>
                {application?.status === "REJECTED"
                  ? "Your previous application was not approved. You can apply again below."
                  : "Fill in the details below. Fields marked as optional can be skipped."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <GuideApplicationForm fullName={user.name} username={user.username} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
