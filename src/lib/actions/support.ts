"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSupport } from "@/lib/authz";
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
    // One thread per customer. If it was closed, the customer's message
    // reopens it so it reappears in the support dashboard.
    const chat = await tx.supportChat.upsert({
      where: { userId },
      update: { status: "OPEN" },
      create: { userId, status: "OPEN" },
    });

    await tx.supportMessage.create({
      data: { chatId: chat.id, senderId: userId, body },
    });
  });

  revalidatePath("/profile");
  revalidatePath("/support");
}

export async function replySupportMessageAction(chatId: string, formData: FormData) {
  const session = await requireSupport("/login?callbackUrl=/support");

  if (!chatId) {
    throw new Error("Missing conversation.");
  }

  const parsed = supportMessageSchema.safeParse({ body: asString(formData.get("body")) });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Reply is invalid.");
  }

  const { body } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const chat = await tx.supportChat.findUnique({ where: { id: chatId } });
    if (!chat) {
      throw new Error("Conversation not found.");
    }

    await tx.supportMessage.create({
      data: { chatId, senderId: session.user!.id, body },
    });

    // Bump updatedAt so the conversation re-sorts to the top of the dashboard.
    await tx.supportChat.update({
      where: { id: chatId },
      data: { status: chat.status },
    });
  });

  revalidatePath("/support");
  revalidatePath("/profile");
}

export async function setSupportChatStatusAction(
  chatId: string,
  status: "OPEN" | "CLOSED",
) {
  await requireSupport("/login?callbackUrl=/support");

  if (!chatId) {
    throw new Error("Missing conversation.");
  }

  await prisma.supportChat.update({
    where: { id: chatId },
    data: { status },
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
    data: { status: "OPEN" },
  });

  revalidatePath("/profile");
  revalidatePath("/support");
}

/**
 * Customer-facing action: mark their support thread as resolved, which removes
 * it from their view so they get a fresh chat the next time they need help.
 */
export async function resolveSupportChatAction() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/profile?tab=support");
  }

  await prisma.supportChat.deleteMany({
    where: { userId: session.user.id },
  });

  revalidatePath("/profile");
  revalidatePath("/support");
}
