import { prisma, safeDb } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GuidesManager } from "@/components/admin/guides-manager";

export const dynamic = "force-dynamic";

export default async function AdminGuidesPage() {
  const session = await requirePermission("guides.manage", "/login?callbackUrl=/admin/guides");

  const [guidesLive, totalLinkedTrips, roleGuideWithoutProfile, guidesWithNonGuideUser] =
    await Promise.all([
      safeDb("admin.guides.live-count", () => prisma.guide.count({ where: { deletedAt: null, user: { deletedAt: null } } }), 0),
      safeDb("admin.guides.linked-trips-count", () => prisma.trip.count({ where: { guideId: { not: null }, deletedAt: null, guide: { deletedAt: null, user: { deletedAt: null } } } }), 0),
      // Orphan check 1: a GUIDE role must always have a linked guide profile.
      safeDb("admin.guides.orphan-role-count", () => prisma.user.count({ where: { role: "GUIDE", deletedAt: null, OR: [{ guide: { is: null } }, { guide: { deletedAt: { not: null } } }] } }), 0),
      // Orphan check 2: a guide profile's linked user must hold the GUIDE role.
      safeDb("admin.guides.orphan-profile-count", () => prisma.guide.count({ where: { deletedAt: null, user: { role: { not: "GUIDE" }, deletedAt: null } } }), 0),
    ]);

  const orphanCount = roleGuideWithoutProfile + guidesWithNonGuideUser;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
        <AdminPageHeader
          title="Manage Guides"
          description="Add, edit, and remove the vetted guides"
          active="guides"
          role={session.user.role}
        />

        {orphanCount > 0 ? (
          <section className="rounded-[1.25rem] border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-heading font-semibold">
              {orphanCount} {orphanCount === 1 ? "account" : "accounts"} in an inconsistent guide state
            </p>
            <p className="mt-1 max-w-3xl leading-6 text-amber-700 dark:text-amber-300">
              {roleGuideWithoutProfile > 0 && (
                <>Users with the GUIDE role but no guide profile: {roleGuideWithoutProfile}. </> 
              )}
              {guidesWithNonGuideUser > 0 && (
                <>Guide profiles whose linked account is not a GUIDE: {guidesWithNonGuideUser}. </> 
              )}
              Fix these via Admin → Users (set the role correctly) or Admin → Guides (delete the orphan profile).
            </p>
          </section>
        ) : null}

        <section className="min-w-0">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Guides live</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{guidesLive}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Trips linked</p>
              <p className="mt-2 font-heading text-2xl font-semibold text-foreground">{totalLinkedTrips}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
          <GuidesManager />
        </section>
      </div>
    </div>
  );
}
