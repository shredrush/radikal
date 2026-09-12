import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { generateAvailableUsername } from "@/lib/available-username";
import { getClientIp, rateLimit, rateLimitError } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/sanitize";
import { z } from "zod";

const guestAccountSchema = z.object({
  name: z
    .string()
    .transform((value) => sanitizeText(value, { maxLength: 100 }))
    .refine((value) => value.length >= 2, "Name must be at least 2 characters"),
  email: z.string().trim().toLowerCase().max(254).email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^\+\d{7,15}$/, "Enter a valid phone number with country code"),
});

export type GuestAccountResult =
  | { success: true; user: { id: string; name: string; email: string }; password: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

/** Creates a customer account for a public intake form without signing it in. */
export async function createGuestAccount(input: unknown): Promise<GuestAccountResult> {
  const parsed = guestAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Correct the contact details below.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.flatMap((issue) => {
          const field = issue.path[0];
          return typeof field === "string" ? [[field, issue.message]] : [];
        }),
      ),
    };
  }

  const ip = await getClientIp();
  const limit = rateLimit(`guest-account:ip:${ip}`, 5, 60 * 60_000);
  if (!limit.success) return { success: false, error: rateLimitError(limit) };

  const { name, email, phone } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists. Please log in to continue." };
  }

  // Six random bytes encode as exactly eight URL-safe Base64 characters.
  const password = crypto.randomBytes(6).toString("base64url");
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        username: await generateAvailableUsername(),
        passwordHash: await bcrypt.hash(password, 10),
      },
      select: { id: true, name: true, email: true },
    });
    return { success: true, user, password };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
      return { success: false, error: "An account with this email already exists. Please log in to continue." };
    }
    throw error;
  }
}
