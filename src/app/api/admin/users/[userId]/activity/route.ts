import { NextResponse } from "next/server";

import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseErrorStatus, prisma } from "@/lib/prisma";
import { ADMIN_USER_ACTIVITY_PAGE_SIZE } from "@/lib/activity-log-display";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await getAuthorizedUser("users.manage");
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId } = await params;
    const pageParam = new URL(request.url).searchParams.get("page");
    const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

    const [activityLogs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * ADMIN_USER_ACTIVITY_PAGE_SIZE,
        take: ADMIN_USER_ACTIVITY_PAGE_SIZE,
      }),
      prisma.activityLog.count({ where: { userId } }),
    ]);

    return NextResponse.json({ activityLogs, page, total });
  } catch (error) {
    console.error("[api/admin/users/activity] failed to load activity log", error);
    return NextResponse.json({ error: "Failed to load activity log" }, { status: getDatabaseErrorStatus(error) });
  }
}
