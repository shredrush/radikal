import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminGuideForm } from "@/components/admin/admin-guide-form";

export const dynamic = "force-dynamic";

export default async function AdminGuidesPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin/guides");
  }

  const guides = await prisma.guide.findMany({
    orderBy: { name: "asc" },
    include: {
      certifications: { orderBy: { yearIssued: "desc" } },
      _count: { select: { activities: true } },
    },
  });

  const totalLinkedTrips = guides.reduce((sum, guide) => sum + guide._count.activities, 0);
  const languagesInUse = new Set(guides.flatMap((guide) => guide.languages)).size;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.08),_transparent_30%)]">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <header className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Admin board</p>
              <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">Guide management</h1>
              <p className="text-sm leading-7 text-muted-foreground">
                Add, edit, and remove the vetted local guides shown across the community and trip pages.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href="/admin/trips" />}>
                Manage trips
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href="/profile" />}>
                Back to profile
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Guides live</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{guides.length}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Trips linked</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{totalLinkedTrips}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Languages covered</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{languagesInUse}</p>
            </div>
          </div>
        </header>

        <Card className="overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
          <CardHeader className="border-b border-border/70 bg-muted/20">
            <CardTitle className="text-xl">Add a guide</CardTitle>
            <CardDescription>Create a new guide that travellers can discover on the community page.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <AdminGuideForm />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {guides.map((guide) => (
            <Card key={guide.id} className="overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
              <CardHeader className="border-b border-border/70 bg-muted/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground">
                        {guide.experienceYears} yrs
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                        {guide.location}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                        /{guide.slug}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{guide.name}</CardTitle>
                      <CardDescription className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {guide._count.activities} trip{guide._count.activities === 1 ? "" : "s"} linked ·{" "}
                        {guide.certifications.length} certification{guide.certifications.length === 1 ? "" : "s"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {guide.languages.slice(0, 4).map((language) => (
                      <Badge key={language} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground/80">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <AdminGuideForm
                  guide={{
                    id: guide.id,
                    name: guide.name,
                    slug: guide.slug,
                    bio: guide.bio,
                    photo: guide.photo,
                    location: guide.location,
                    experienceYears: guide.experienceYears,
                    languages: guide.languages,
                    certifications: guide.certifications.map((cert) => ({
                      title: cert.title,
                      issuingBody: cert.issuingBody,
                      yearIssued: cert.yearIssued,
                      credentialUrl: cert.credentialUrl,
                    })),
                  }}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
