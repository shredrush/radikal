import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TravelStylesManager } from "@/components/admin/travel-styles-manager";
import { requirePermission } from "@/lib/authz";
import { loadDb, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const tripSelect = {
  id: true,
  title: true,
  location: true,
  guide: { select: { name: true } },
} as const;

export default async function AdminStylesPage() {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/styles");
  const [styles, availableTrips] = await Promise.all([
    loadDb("admin.styles.list", () => prisma.travelStyle.findMany({
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        tripLinks: {
          where: { trip: { deletedAt: null } },
          orderBy: { trip: { title: "asc" } },
          select: { trip: { select: tripSelect } },
        },
        _count: { select: { tripLinks: { where: { trip: { deletedAt: null } } } } },
      },
    })),
    loadDb("admin.styles.available-trips", () => prisma.trip.findMany({
      where: { deletedAt: null }, orderBy: { title: "asc" }, take: 50, select: tripSelect,
    })),
  ]);

  return <div className="min-h-screen"><div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10">
    <AdminPageHeader title="Manage Styles" description="Edit styles" active="styles" role={session.user.role} />
    <section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
      <TravelStylesManager styles={styles.map((style) => ({ id: style.id, name: style.name, slug: style.slug, image: style.image, active: style.active, tripCount: style._count.tripLinks, trips: style.tripLinks.map(({ trip }) => ({ id: trip.id, title: trip.title, location: trip.location, guideName: trip.guide?.name ?? null })) }))} availableTrips={availableTrips.map((trip) => ({ id: trip.id, title: trip.title, location: trip.location, guideName: trip.guide?.name ?? null }))} />
    </section>
  </div></div>;
}
