import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAdminBoardHref } from "@/lib/admin-sections";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  redirect(getAdminBoardHref(user?.role) ?? "/profile");
}
