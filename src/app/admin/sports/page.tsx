import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SportsManager } from "@/components/admin/sports-manager";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSportsPage() {
  const session = await requirePermission("trips.manage", "/login?callbackUrl=/admin/sports");
  const sports = await prisma.sport.findMany({ orderBy: [{ deletedAt: "asc" }, { sortOrder: "asc" }, { name: "asc" }], include: { tripLinks: { where: { trip: { deletedAt: null } }, select: { trip: { select: { id: true, title: true, location: true } } } } } });
  const trips = await prisma.trip.findMany({ where: { deletedAt: null }, orderBy: { title: "asc" }, select: { id: true, title: true, location: true } });
  return <div className="min-h-screen"><div className="mx-auto flex max-w-8xl flex-col gap-8 px-6 py-10 sm:py-14 lg:px-10"><AdminPageHeader title="Manage Sports" description="Edit sports" active="sports" role={session.user.role} /><section className="rounded-[1.5rem] border border-border/80 bg-background/95 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]"><SportsManager sports={sports.map((sport) => ({ id: sport.id, name: sport.name, icon: sport.icon, active: sport.active, deletedAt: sport.deletedAt?.toISOString() ?? null, trips: sport.tripLinks.map(({ trip }) => trip) }))} trips={trips} /></section></div></div>;
}
