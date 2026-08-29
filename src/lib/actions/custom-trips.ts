"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import {
  createCustomTripSchema,
  customTripMessageSchema,
} from "@/lib/validations/custom-trip";
import { MAX_OPEN_CUSTOM_TRIP_CHATS } from "@/lib/custom-trips";

export type CreateCustomTripResult =
  | { success: true; requestId: string }
  | { success: false; error: string };

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

/**
 * Creates a custom trip request for the logged-in user. The request starts as
 * NEW and a dedicated chat thread is opened in the same transaction so the
 * support team can quote and confirm it.
 */
export async function createCustomTripRequestAction(
  input: unknown,
): Promise<CreateCustomTripResult> {
  const parsed = createCustomTripSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request details.",
    };
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You must be logged in to request a custom trip." };
  }

  const requestLimit = rateLimit(`custom-trip-create:user:${userId}`, 5, 60 * 60_000);
  if (!requestLimit.success) {
    return { success: false, error: rateLimitError(requestLimit) };
  }

  const openRequestCount = await prisma.customTripRequest.count({
    where: { userId, status: { notIn: ["CONFIRMED", "CANCELLED"] }, deletedAt: null },
  });
  if (openRequestCount >= MAX_OPEN_CUSTOM_TRIP_CHATS) {
    return {
      success: false,
      error: `You can have up to ${MAX_OPEN_CUSTOM_TRIP_CHATS} open custom trip chats at a time. Close an existing request before starting a new one.`,
    };
  }

  const {
    groupType,
    sports,
    startDate,
    endDate,
    location,
    participantCount,
    budgetRupees,
    requirements,
  } = parsed.data;

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.customTripRequest.create({
      data: {
        userId,
        groupType,
        sports,
        startDate: new Date(`${startDate}T00:00:00`),
        endDate: new Date(`${endDate}T00:00:00`),
        location,
        participantCount,
        budgetRupees,
        requirements: requirements || null,
        status: "NEW",
        chat: {
          create: {},
        },
      },
    });

    return created;
  });

  await logActivity({
    userId,
    action: "CUSTOM_TRIP_REQUESTED",
    label: "Requested a custom trip",
    metadata: {
      requestId: request.id,
      groupType,
      sports,
      participantCount,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/support");

  return { success: true, requestId: request.id };
}

/**
 * Customer sends a message on their own custom trip request thread.
 */
export async function sendCustomTripMessageAction(requestId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/custom-trip");
  }

  if (!requestId) {
    throw new Error("Missing request.");
  }

  const parsed = customTripMessageSchema.safeParse({ body: asString(formData.get("body")) });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Message is invalid.");
  }

  const userId = session.user.id;
  const { body } = parsed.data;

  const msgLimit = rateLimit(`custom-trip-send:user:${userId}`, 20, 60_000);
  if (!msgLimit.success) {
    throw new Error(rateLimitError(msgLimit));
  }

  await prisma.$transaction(async (tx) => {
    const request = await tx.customTripRequest.findFirst({
      where: { id: requestId, userId },
      include: { chat: { select: { id: true } } },
    });
    if (!request?.chat) {
      throw new Error("Request not found.");
    }

    await tx.customTripMessage.create({
      data: { chatId: request.chat.id, senderId: userId, body },
    });

    // Bump the request so it re-sorts to the top of the support board.
    await tx.customTripRequest.update({
      where: { id: requestId },
      data: { status: request.status },
    });
  });

  await logActivity({
    userId,
    action: "CUSTOM_TRIP_MESSAGE_SENT",
    label: "Sent a custom trip message",
    metadata: { requestId },
  });

  revalidatePath("/custom-trip");
  revalidatePath("/profile");
  revalidatePath("/support");
}

/**
 * Support agent replies to a custom trip request thread.
 */
export async function replyCustomTripMessageAction(requestId: string, formData: FormData) {
  const session = await requirePermission("support.manage", "/login?callbackUrl=/support");

  if (!requestId) {
    throw new Error("Missing request.");
  }

  const parsed = customTripMessageSchema.safeParse({ body: asString(formData.get("body")) });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Reply is invalid.");
  }

  const { body } = parsed.data;

  const replyLimit = rateLimit(`custom-trip-reply:user:${session.user.id}`, 60, 60_000);
  if (!replyLimit.success) {
    throw new Error(rateLimitError(replyLimit));
  }

  await prisma.$transaction(async (tx) => {
    const request = await tx.customTripRequest.findUnique({
      where: { id: requestId },
      include: { chat: { select: { id: true } } },
    });
    if (!request?.chat) {
      throw new Error("Request not found.");
    }
    if (request.deletedAt) {
      throw new Error("This request was deleted by the customer.");
    }

    await tx.customTripMessage.create({
      data: { chatId: request.chat.id, senderId: session.user!.id, body },
    });

    await tx.customTripRequest.update({
      where: { id: requestId },
      data: { status: request.status },
    });
  });

  await logActivity({
    userId: session.user!.id,
    action: "CUSTOM_TRIP_REPLY_SENT",
    label: "Replied to a custom trip request",
    metadata: { requestId },
  });

  revalidatePath("/support");
  revalidatePath("/custom-trip");
}

/**
 * Customer soft-deletes their own custom trip request. The row (and its chat
 * thread) is kept so the support dashboard can show it under a "Deleted"
 * section, but it disappears everywhere customer-facing. Confirmed requests
 * cannot be deleted so a confirmed booking's history is never dropped.
 */
export async function deleteCustomTripRequestAction(requestId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/custom-trip");
  }

  if (!requestId) {
    throw new Error("Missing request.");
  }

  const userId = session.user.id;

  const request = await prisma.customTripRequest.findFirst({
    where: { id: requestId, userId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!request) {
    throw new Error("Request not found.");
  }

  if (request.status === "CONFIRMED") {
    throw new Error("A confirmed custom trip cannot be deleted. Contact support for help.");
  }

  await prisma.customTripRequest.update({
    where: { id: requestId },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    userId,
    action: "CUSTOM_TRIP_REQUEST_DELETED",
    label: "Deleted a custom trip request",
    metadata: { requestId },
  });

  revalidatePath("/custom-trip");
  revalidatePath("/profile");
  revalidatePath("/support");
}

/**
 * Support agent moves a custom trip request through its lifecycle.
 */
export async function setCustomTripStatusAction(
  requestId: string,
  status: "NEW" | "IN_REVIEW" | "QUOTED" | "CONFIRMED" | "CANCELLED",
) {
  await requirePermission("support.manage", "/login?callbackUrl=/support");

  if (!requestId) {
    throw new Error("Missing request.");
  }

  await prisma.customTripRequest.update({
    where: { id: requestId },
    data: { status },
  });

  revalidatePath("/support");
  revalidatePath("/custom-trip");
  revalidatePath("/profile");
}
