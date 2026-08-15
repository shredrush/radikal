import { z } from "zod";

export const supportMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be 2000 characters or fewer"),
});

export type SupportMessageInput = z.infer<typeof supportMessageSchema>;
