import { EmailDeliveryStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type QueuedEmail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const MAX_ATTEMPTS = 5;
const PROCESSING_TIMEOUT_MS = 10 * 60_000;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

function maskRecipient(value: string): string {
  const at = value.lastIndexOf("@");
  if (at < 1) return "invalid";
  const local = value.slice(0, at);
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${value.slice(at + 1)}`;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message).slice(0, 1_000);
  }
  return String(error).slice(0, 1_000);
}

function isPermanentProviderError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return false;
  const status = (error as { statusCode?: unknown }).statusCode;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 408 && status !== 429;
}

export async function queueEmail(input: QueuedEmail): Promise<string | null> {
  if (!input.to) {
    console.error("[email] not queued: missing recipient", { subject: input.subject });
    return null;
  }

  const delivery = await prisma.emailDelivery.create({ data: input });
  console.info("[email] queued", {
    emailId: delivery.id,
    recipient: maskRecipient(delivery.to),
    subject: delivery.subject,
  });
  return delivery.id;
}

async function claimDelivery(id: string) {
  const claimed = await prisma.emailDelivery.updateMany({
    where: { id, status: { in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.RETRYING] } },
    data: { status: EmailDeliveryStatus.PROCESSING, attempts: { increment: 1 }, lastAttemptAt: new Date() },
  });
  if (claimed.count === 0) return null;
  return prisma.emailDelivery.findUnique({ where: { id } });
}

export async function dispatchQueuedEmail(id: string, deliver: (input: QueuedEmail) => Promise<{ id: string }>) {
  const delivery = await claimDelivery(id);
  if (!delivery) return false;

  const log = { emailId: delivery.id, recipient: maskRecipient(delivery.to), subject: delivery.subject, attempt: delivery.attempts };
  console.info("[email] dispatching", log);

  try {
    const result = await deliver({
      to: delivery.to,
      subject: delivery.subject,
      html: delivery.html,
      text: delivery.text ?? undefined,
    });
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: EmailDeliveryStatus.SENT, sentAt: new Date(), providerMessageId: result.id, lastError: null },
    });
    console.info("[email] accepted by provider", { ...log, provider: "resend", providerMessageId: result.id });
    return true;
  } catch (error) {
    const permanent = isPermanentProviderError(error);
    const exhausted = delivery.attempts >= MAX_ATTEMPTS;
    const status = permanent || exhausted ? EmailDeliveryStatus.FAILED : EmailDeliveryStatus.RETRYING;
    const delay = RETRY_DELAYS_MS[Math.min(delivery.attempts - 1, RETRY_DELAYS_MS.length - 1)];
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status,
        lastError: errorMessage(error),
        nextAttemptAt: new Date(Date.now() + delay),
      },
    });
    console.error(status === EmailDeliveryStatus.FAILED ? "[email] permanently failed" : "[email] retry scheduled", {
      ...log,
      status: (error as { statusCode?: unknown })?.statusCode,
      error: errorMessage(error),
    });
    return false;
  }
}

export async function processEmailOutbox(deliver: (input: QueuedEmail) => Promise<{ id: string }>, limit = 25) {
  const now = new Date();
  await prisma.emailDelivery.updateMany({
    where: { status: EmailDeliveryStatus.PROCESSING, lastAttemptAt: { lt: new Date(now.getTime() - PROCESSING_TIMEOUT_MS) } },
    data: { status: EmailDeliveryStatus.RETRYING, nextAttemptAt: now, lastError: "Worker timed out before recording a result." },
  });
  const jobs = await prisma.emailDelivery.findMany({
    where: { status: { in: [EmailDeliveryStatus.PENDING, EmailDeliveryStatus.RETRYING] }, nextAttemptAt: { lte: now } },
    select: { id: true }, orderBy: { createdAt: "asc" }, take: limit,
  });
  const results = await Promise.all(jobs.map(({ id }) => dispatchQueuedEmail(id, deliver)));
  return { selected: jobs.length, sent: results.filter(Boolean).length, failed: results.filter((result) => !result).length };
}
