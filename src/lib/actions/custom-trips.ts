"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSupport } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import {
  createCustomTripSchema,
  customTripMessageSchema,
} from "@/lib/validations/custom-trip";

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

    // Bump the request so it re-sorts to the top of the support dashboard.
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
  const session = await requireSupport("/login?callbackUrl=/support");

  if (!requestId) {
    throw new Error("Missing request.");
  }

  const parsed = customTripMessageSchema.safeParse({ body: asString(formData.get("body")) });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Reply is invalid.");
  }

  const { body } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const request = await tx.customTripRequest.findUnique({
      where: { id: requestId },
      include: { chat: { select: { id: true } } },
    });
    if (!request?.chat) {
      throw new Error("Request not found.");
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
 * Support agent moves a custom trip request through its lifecycle.
 */
export async function setCustomTripStatusAction(
  requestId: string,
  status: "NEW" | "IN_REVIEW" | "QUOTED" | "CONFIRMED" | "CANCELLED",
) {
  await requireSupport("/login?callbackUrl=/support");

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
