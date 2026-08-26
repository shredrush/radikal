import { z } from "zod";

import { isValidUsername } from "@/lib/sanitize";

export const USER_ROLES = ["USER", "GUIDE", "SUPPORT", "FINANCE", "CONTENT", "ADMIN", "ADMAX"] as const;

export type UserRoleValue = (typeof USER_ROLES)[number];

export const updateUserSchema = z.object({
  userId: z.string().min(1, "Missing user id"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be 100 characters or fewer"),
  email: z.string().trim().toLowerCase().max(254, "Email is too long").email("Enter a valid email address"),
  // Empty clears the username; otherwise it must follow the same public-slug
  // rules as the signup flow (see lib/sanitize.ts).
  username: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .refine(
      (value) => value === null || isValidUsername(value),
      "Use 3–30 lowercase letters or numbers, with single -, _, or . separators.",
    ),
  role: z.enum(USER_ROLES),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
