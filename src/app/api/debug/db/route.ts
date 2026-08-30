import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/lib/authz";
import { getDatabaseConnectionLogInfo } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // This endpoint exposes database connection details — restrict it to the
  // super admin only. Never leave host/port/database info public.
  const user = await getAuthorizedUser("system.debug");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectionInfo = getDatabaseConnectionLogInfo();

  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;

    return NextResponse.json({
      ok: true,
      connection: connectionInfo,
      result,
    });
  } catch (error) {
    console.error("[debug/db] database health check failed", error);
    return NextResponse.json({ ok: false, connection: connectionInfo }, { status: 503 });
  }
}
