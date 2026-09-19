import * as Sentry from "@sentry/nextjs";
import { validateProductionEnvironment } from "@/lib/env";

export async function register() {
  validateProductionEnvironment();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
