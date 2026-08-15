import { z } from "zod";

import { sanitizeText } from "@/lib/sanitize";

export const supportMessageSchema = z.object({
  body: z
    .string()
    .transform((value) => sanitizeText(value, { maxLength: 2000, allowNewlines: true }))
    .refine((value) => value.length > 0, "Message cannot be empty"),
});

export type SupportMessageInput = z.infer<typeof supportMessageSchema>;
