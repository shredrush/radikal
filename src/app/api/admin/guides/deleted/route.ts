import { NextResponse } from "next/server";

import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, loadDb, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthorizedUser("guides.manage");
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const guides = await loadDb("api.admin.guides.deleted", () =>
      prisma.guide.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          location: true,
          deletedAt: true,
          deletedByGuideRemoval: true,
          user: { select: { email: true, username: true, deletedAt: true } },
          reviews: { where: { deletedWithGuide: true }, select: { id: true } },
          tripDrafts: { where: { deletedWithGuide: true }, select: { id: true } },
          trips: {
            where: { deletedWithGuide: true },
            select: {
              id: true,
              slots: { where: { deletedWithTrip: true }, select: { id: true } },
              bookings: { where: { deletedWithTrip: true }, select: { id: true } },
              wishlistItems: { where: { deletedWithTrip: true }, select: { id: true } },
            },
          },
        },
      }),
    );

    return NextResponse.json({ guides });
  } catch (error) {
    console.error("[api/admin/guides/deleted] failed to load deleted guides", error);
    return NextResponse.json({ error: "Failed to load deleted guides" }, { status: getDatabaseErrorStatus(error) });
  }
}
