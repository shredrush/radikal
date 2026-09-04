import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { loadDb, prisma } from "@/lib/prisma";
import { getAdminBoardHref } from "@/lib/admin-sections";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  const user = await loadDb(
    "admin.index-user",
    () =>
      prisma.user.findFirst({
        where: { id: session.user.id, deletedAt: null },
        select: { role: true },
      }),
  );

  redirect(getAdminBoardHref(user?.role) ?? "/profile");
}
