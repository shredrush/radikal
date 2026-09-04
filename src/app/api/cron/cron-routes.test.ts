import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completePastBookings: vi.fn(),
  sweepOrphanMedia: vi.fn(),
}));

vi.mock("@/lib/booking-completion", () => ({
  completePastBookings: mocks.completePastBookings,
}));
vi.mock("@/lib/media-cleanup", () => ({
  sweepOrphanMedia: mocks.sweepOrphanMedia,
}));

import { GET as completeBookings } from "./complete-bookings/route";
import { GET as cleanupMedia } from "./cleanup-media/route";

const originalCronSecret = process.env.CRON_SECRET;

type CronRoute = {
  run: (request: Request) => Promise<Response>;
  worker: ReturnType<typeof vi.fn>;
  expected: unknown;
};

const routes: CronRoute[] = [
  {
    run: completeBookings,
    worker: mocks.completePastBookings,
    expected: { completed: 3 },
  },
  {
    run: cleanupMedia,
    worker: mocks.sweepOrphanMedia,
    expected: { scanned: 12, deleted: 3 },
  },
];

function request(authorization?: string) {
  return new Request("https://radikal.test/api/cron/job", {
    headers: authorization ? { authorization } : undefined,
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret";
  mocks.completePastBookings.mockResolvedValue(3);
  mocks.sweepOrphanMedia.mockResolvedValue({ scanned: 12, deleted: 3 });
});

afterEach(() => {
  vi.clearAllMocks();
  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalCronSecret;
  }
});

describe.each(routes)("cron route", ({ run, worker, expected }) => {
  it("fails closed when no cron secret is configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await run(request("Bearer test-cron-secret"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(worker).not.toHaveBeenCalled();
  });

  it.each([undefined, "Basic test-cron-secret", "Bearer wrong-secret"])(
    "rejects a missing or incorrect bearer token",
    async (authorization) => {
      const response = await run(request(authorization));

      expect(response.status).toBe(401);
      expect(worker).not.toHaveBeenCalled();
    },
  );

  it("runs the job only for the exact configured bearer token", async () => {
    const response = await run(request("Bearer test-cron-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expected);
    expect(worker).toHaveBeenCalledOnce();
  });
});
