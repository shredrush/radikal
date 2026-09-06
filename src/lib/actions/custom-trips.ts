"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { logActivity } from "@/lib/activity-log";
import { rateLimit, rateLimitError } from "@/lib/rate-limit";
import {
  createCustomDateEnquirySchema,
  createCustomTripSchema,
  customTripMessageSchema,
} from "@/lib/validations/custom-trip";
import { MAX_OPEN_CUSTOM_TRIP_CHATS } from "@/lib/custom-trips";
import { createGuestAccount } from "@/lib/guest-account";
import { guestAccountCreatedEmail, sendEmailAfter } from "@/lib/email";

export type CreateCustomTripResult =
  | { success: true; requestId: string }
  | { success: false; error: string };

export type CreateCustomDateEnquiryResult =
  | { success: true; requestId: string }
  | { success: false; error: string; loginRequired?: boolean };

function asString(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

/**
 * Creates a custom trip request. Guests receive an account so the request can
 * be followed in its dedicated chat.
 * NEW and a dedicated chat thread is opened in the same transaction so the
 * support team can quote and confirm it.
 */
export async function createCustomTripRequestAction(
  input: unknown,
): Promise<CreateCustomTripResult> {
  const session = await auth();
  const parsed = createCustomTripSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request details.",
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

  let userId = session?.user?.id;
  if (!userId) {
    const account = await createGuestAccount({
      name: parsed.data.contactName,
      email: parsed.data.contactEmail,
      phone: parsed.data.contactPhone,
    });
    if (!account.success) return { success: false, error: account.error };
    userId = account.user.id;
    sendEmailAfter(guestAccountCreatedEmail({
      to: account.user.email,
      name: account.user.name,
      password: account.password,
    }));
  }

  const requestLimit = rateLimit(`custom-trip-create:user:${userId}`, 5, 60 * 60_000);
  if (!requestLimit.success) return { success: false, error: rateLimitError(requestLimit) };

  let request;
  try {
    request = await prisma.$transaction(async (tx) => {
      // Lock the account row so concurrent requests for the same customer
      // serialize before checking the open-chat limit.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const openRequestCount = await tx.customTripRequest.count({
        where: { userId, status: { notIn: ["CONFIRMED", "CANCELLED"] }, deletedAt: null },
      });
      if (openRequestCount >= MAX_OPEN_CUSTOM_TRIP_CHATS) {
        throw new Error("OPEN_REQUEST_LIMIT");
      }
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
  } catch (error) {
    if (error instanceof Error && error.message === "OPEN_REQUEST_LIMIT") {
      return {
        success: false,
        error: `You can have up to ${MAX_OPEN_CUSTOM_TRIP_CHATS} open custom trip chats at a time. Close an existing request before starting a new one.`,
      };
    }
    throw error;
  }

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
 * Opens a custom-trip chat from a scheduled trip when a traveller needs a
 * different departure date. Trip details come from the database, never from
 * the browser, so support receives an accurate brief.
 */
export async function createCustomDateEnquiryAction(
  input: unknown,
): Promise<CreateCustomDateEnquiryResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Sign in to send a custom date enquiry.", loginRequired: true };
  }

  const parsed = createCustomDateEnquirySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid enquiry details." };
  }

  const { tripId, startDate } = parsed.data;
  if (startDate < new Date().toISOString().slice(0, 10)) {
    return { success: false, error: "Choose a start date in the future." };
  }

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      deletedAt: null,
      OR: [{ guideId: null }, { guide: { deletedAt: null, user: { deletedAt: null } } }],
    },
    select: { title: true, type: true, location: true, durationDays: true },
  });
  if (!trip) {
    return { success: false, error: "This trip is no longer available." };
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + Math.max(trip.durationDays - 1, 0));
  const endDate = end.toISOString().slice(0, 10);
  const userId = session.user.id;
  const requestLimit = rateLimit(`custom-trip-create:user:${userId}`, 5, 60 * 60_000);
  if (!requestLimit.success) return { success: false, error: rateLimitError(requestLimit) };

  let request;
  try {
    request = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const openRequestCount = await tx.customTripRequest.count({
        where: { userId, status: { notIn: ["CONFIRMED", "CANCELLED"] }, deletedAt: null },
      });
      if (openRequestCount >= MAX_OPEN_CUSTOM_TRIP_CHATS) {
        throw new Error("OPEN_REQUEST_LIMIT");
      }

      return tx.customTripRequest.create({
        data: {
          userId,
          groupType: "PRIVATE",
          sports: [trip.type],
          startDate: start,
          endDate: new Date(`${endDate}T00:00:00.000Z`),
          location: trip.location,
          participantCount: 1,
          requirements: `Custom date enquiry for ${trip.title}.`,
          status: "NEW",
          chat: {
            create: {
              messages: {
                create: {
                  senderId: userId,
                  body: `I'd like to enquire about ${trip.title} starting on ${startDate}.`,
                },
              },
            },
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "OPEN_REQUEST_LIMIT") {
      return {
        success: false,
        error: `You can have up to ${MAX_OPEN_CUSTOM_TRIP_CHATS} open custom trip chats at a time. Close an existing request before starting a new one.`,
      };
    }
    throw error;
  }

  await logActivity({
    userId,
    action: "CUSTOM_TRIP_REQUESTED",
    label: "Requested a custom trip date",
    metadata: { requestId: request.id, tripId, startDate },
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

  const userId = session.user.id;
  const msgLimit = rateLimit(`custom-trip-send:user:${userId}`, 20, 60_000);
  if (!msgLimit.success) {
    throw new Error(rateLimitError(msgLimit));
  }

  const parsed = customTripMessageSchema.safeParse({ body: asString(formData.get("body")) });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Message is invalid.");
  }

  const { body } = parsed.data;

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

  const replyLimit = rateLimit(`custom-trip-reply:user:${session.user.id}`, 60, 60_000);
  if (!replyLimit.success) {
    throw new Error(rateLimitError(replyLimit));
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
