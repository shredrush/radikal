"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Mark all of the signed-in user's notifications as read. */
export async function markAllNotificationsReadAction() {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/profile");
}

/** Delete all of the signed-in user's notifications. */
export async function clearAllNotificationsAction() {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.notification.deleteMany({
    where: { userId: session.user.id },
  });

  revalidatePath("/profile");
}

/** Mark a single notification (scoped to the signed-in user) as read. */
export async function markNotificationReadAction(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id || !notificationId) return;

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/profile");
}
