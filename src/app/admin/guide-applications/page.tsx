import { CalendarDays, CheckCircle2, Clock3, ExternalLink, XCircle } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApproveGuideButton, RejectGuideButton } from "@/components/admin/review-guide-application-buttons";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const dynamic = "force-dynamic";

export default async function AdminGuideApplicationsPage() {
  await requireAdmin("/login?callbackUrl=/admin/guide-applications");

  const applications = await prisma.guideApplication.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, username: true, email: true } },
      certifications: { orderBy: { yearIssued: "desc" } },
      reviewedBy: { select: { name: true } },
    },
  });

  const pendingCount = applications.filter((app) => app.status === "PENDING").length;
  const approvedCount = applications.filter((app) => app.status === "APPROVED").length;
  const rejectedCount = applications.filter((app) => app.status === "REJECTED").length;

  const statusBadge = (status: string) => {
    if (status === "PENDING") {
      return (
        <Badge variant="outline" className="rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-600">
          <Clock3 className="h-3 w-3" /> Pending
        </Badge>
      );
    }
    if (status === "APPROVED") {
      return (
        <Badge variant="outline" className="rounded-full border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
          <CheckCircle2 className="h-3 w-3" /> Approved
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="rounded-full border-destructive/40 bg-destructive/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-destructive">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.08),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.08),_transparent_30%)]">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Guide Applications"
          description={'Review guide applications submitted through the "Become a Guide" flow'}
          active="applications"
        />

        <section className="min-w-0">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{pendingCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{approvedCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{rejectedCount}</p>
            </div>
          </div>
        </section>

        {applications.length === 0 ? (
          <Card className="border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
            <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
              <CalendarDays className="size-10 text-muted-foreground" />
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-semibold tracking-wide">No applications yet</h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  When travellers apply to become guides, their submissions will appear here for review.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            {applications.map((application) => (
              <Card key={application.id} className="overflow-hidden border-border/70 bg-background/95 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)]">
                <CardHeader className="border-b border-border/70 bg-muted/20">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(application.status)}
                        <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                          {application.experienceYears} yrs
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                          {application.location}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-xl">{application.name}</CardTitle>
                        <CardDescription className="mt-1 text-sm leading-6 text-muted-foreground">
                          {application.user.username ? `@${application.user.username}` : ""}
                          {application.user.email ? ` · ${application.user.email}` : ""}
                          {application.phone ? ` · ${application.phone}` : ""}
                        </CardDescription>
                      </div>
                    </div>
                    {application.status === "PENDING" ? (
                      <div className="flex flex-wrap gap-2">
                        <ApproveGuideButton applicationId={application.id} applicantName={application.name} />
                        <RejectGuideButton applicationId={application.id} applicantName={application.name} />
                      </div>
                    ) : (
                      <CardDescription className="text-sm text-muted-foreground">
                        {application.reviewedAt
                          ? `Reviewed ${application.reviewedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`
                          : ""}
                        {application.reviewedBy?.name ? ` by ${application.reviewedBy.name}` : ""}
                      </CardDescription>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">About</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-foreground/90">{application.bio}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {application.languages.map((language) => (
                      <Badge key={language} variant="secondary" className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground/80">
                        {language}
                      </Badge>
                    ))}
                  </div>

                  {application.certifications.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Certifications</p>
                      <ul className="mt-2 space-y-2">
                        {application.certifications.map((cert) => (
                          <li key={cert.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/90">
                            <span className="font-medium">{cert.title}</span>
                            <span className="text-muted-foreground">— {cert.issuingBody}</span>
                            {cert.yearIssued ? <span className="text-muted-foreground">({cert.yearIssued})</span> : null}
                            {cert.credentialUrl ? (
                              <a
                                href={cert.credentialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
                              >
                                View credential <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {[
                      ["Instagram", application.instagramUrl],
                      ["Facebook", application.facebookUrl],
                      ["YouTube", application.youtubeUrl],
                      ["Website", application.websiteUrl],
                    ]
                      .filter(([, url]) => url)
                      .map(([label, url]) => (
                        <a
                          key={label}
                          href={url ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-medium text-foreground/80 transition hover:text-foreground"
                        >
                          {label} <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                  </div>

                  {application.photos.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Photos</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {application.photos.map((photo, index) => (
                          <a key={photo} href={photo} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline underline-offset-4">
                            Photo {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
