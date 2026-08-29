"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { sendEmailAfter, supportReplyEmail } from "@/lib/email";
import { logActivity } from "@/lib/activity-log";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import { supportMessageSchema } from "@/lib/validations/support";

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

export async function sendSupportMessageAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile?tab=support");
  }

  const parsed = supportMessageSchema.safeParse({ body: asString(formData.get("body")) });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Message is invalid.");
  }

  const userId = session.user.id;
  const { body } = parsed.data;

  // Cap message volume per customer to discourage spam flooding.
  const msgLimit = rateLimit(`support-send:user:${userId}`, 20, 60_000);
  if (!msgLimit.success) {
    throw new Error(rateLimitError(msgLimit));
  }

  await prisma.$transaction(async (tx) => {
    // One thread per customer. If it was resolved (soft-deleted) or closed, the
    // customer's message reopens it and clears the deletion so it reappears in
    // the support board.
    const chat = await tx.supportChat.upsert({
      where: { userId },
      update: { status: "OPEN", deletedAt: null },
      create: { userId, status: "OPEN" },
    });

    await tx.supportMessage.create({
      data: { chatId: chat.id, senderId: userId, body },
    });
  });

  await logActivity({
    userId,
    action: "SUPPORT_MESSAGE_SENT",
    label: "Sent a support message",
  });

  revalidatePath("/profile");
  revalidatePath("/support");
}

export async function replySupportMessageAction(chatId: string, formData: FormData) {
  const session = await requirePermission("support.manage", "/login?callbackUrl=/support");

  if (!chatId) {
    throw new Error("Missing conversation.");
  }

  const parsed = supportMessageSchema.safeParse({ body: asString(formData.get("body")) });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Reply is invalid.");
  }

  const { body } = parsed.data;

  const replyLimit = rateLimit(`support-reply:user:${session.user.id}`, 60, 60_000);
  if (!replyLimit.success) {
    throw new Error(rateLimitError(replyLimit));
  }

  // Resolve the customer inside the transaction so we can notify them afterwards
  // without TypeScript losing track of the value assigned in the callback.
  const customer = await prisma.$transaction(async (tx) => {
    const chat = await tx.supportChat.findUnique({
      where: { id: chatId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!chat) {
      throw new Error("Conversation not found.");
    }
    if (chat.deletedAt) {
      throw new Error("This conversation was resolved by the customer.");
    }

    await tx.supportMessage.create({
      data: { chatId, senderId: session.user!.id, body },
    });

    // Bump updatedAt so the conversation re-sorts to the top of the board.
    await tx.supportChat.update({
      where: { id: chatId },
      data: { status: chat.status },
    });

    return { email: chat.user.email, name: chat.user.name };
  });

  await logActivity({
    userId: session.user!.id,
    action: "SUPPORT_REPLY_SENT",
    label: "Replied to a support chat",
    metadata: { chatId },
  });

  // Notify the customer that an agent replied, without blocking the reply.
  sendEmailAfter(
    supportReplyEmail({
      to: customer.email,
      name: customer.name,
      reply: body,
    }),
  );

  revalidatePath("/support");
  revalidatePath("/profile");
}

export async function setSupportChatStatusAction(
  chatId: string,
  status: "OPEN" | "CLOSED",
) {
  await requirePermission("support.manage", "/login?callbackUrl=/support");

  if (!chatId) {
    throw new Error("Missing conversation.");
  }

  await prisma.supportChat.update({
    where: { id: chatId },
    data: {
      status,
      // Reopening a resolved thread clears its soft-delete marker so it leaves
      // the "Resolved" section instead of appearing in two places.
      ...(status === "OPEN" ? { deletedAt: null } : {}),
    },
  });

  revalidatePath("/support");
  revalidatePath("/profile");
}

/**
 * Support agent marks a closed conversation as resolved. The thread is
 * soft-deleted (deletedAt set) so it moves from the "Closed" section to the
 * "Resolved" section of the support dashboard.
 */
export async function markSupportChatResolvedAction(chatId: string) {
  await requirePermission("support.manage", "/login?callbackUrl=/support");

  if (!chatId) {
    throw new Error("Missing conversation.");
  }

  const chat = await prisma.supportChat.findUnique({
    where: { id: chatId },
    select: { status: true, deletedAt: true },
  });
  if (!chat) {
    throw new Error("Conversation not found.");
  }
  if (chat.deletedAt) {
    throw new Error("This conversation is already resolved.");
  }

  await prisma.supportChat.update({
    where: { id: chatId },
    data: { status: "CLOSED", deletedAt: new Date() },
  });

  revalidatePath("/support");
  revalidatePath("/profile");
}

/**
 * Customer-facing action: reopen their own support thread after a support
 * agent has closed it.
 */
export async function reopenSupportChatAction() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile?tab=support");
  }

  await prisma.supportChat.updateMany({
    where: { userId: session.user.id },
    data: { status: "OPEN", deletedAt: null },
  });

  revalidatePath("/profile");
  revalidatePath("/support");
}

/**
 * Customer-facing action: mark their support thread as resolved. The thread is
 * soft-deleted (deletedAt set) so it disappears from the customer's view but is
 * still shown under the "Resolved" section of the support dashboard. A fresh
 * message from the customer clears the marker and reopens the thread.
 */
export async function resolveSupportChatAction() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile?tab=support");
  }

  await prisma.supportChat.updateMany({
    where: { userId: session.user.id },
    data: { status: "CLOSED", deletedAt: new Date() },
  });

  revalidatePath("/profile");
  revalidatePath("/support");
}
