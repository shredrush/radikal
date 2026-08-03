import { NextResponse } from "next/server";
import { getDatabaseConnectionLogInfo } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const connectionInfo = getDatabaseConnectionLogInfo();

  try {
    const result = await prisma.$queryRawUnsafe("SELECT 1 as ok");

    return NextResponse.json({
      ok: true,
      connection: connectionInfo,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        connection: connectionInfo,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
