CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRYING', 'SENT', 'FAILED');

CREATE TABLE "email_deliveries" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_deliveries_status_nextAttemptAt_idx" ON "email_deliveries"("status", "nextAttemptAt");
CREATE INDEX "email_deliveries_createdAt_idx" ON "email_deliveries"("createdAt" DESC);
