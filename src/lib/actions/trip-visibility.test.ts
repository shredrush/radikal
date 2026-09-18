import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  hasPermission: vi.fn(),
  logActivity: vi.fn(),
  revalidatePath: vi.fn(),
  tripFindUnique: vi.fn(),
  tripUpdate: vi.fn(),
  updateTag: vi.fn(),
  userFindFirst: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/authz", () => ({ hasPermission: mocks.hasPermission }));
vi.mock("@/lib/activity-log", () => ({ logActivity: mocks.logActivity }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: mocks.userFindFirst },
    trip: { findUnique: mocks.tripFindUnique, update: mocks.tripUpdate },
  },
}));

import { setTripActiveAction } from "./trip-visibility";

const trip = {
  id: "trip-1",
  title: "Summit trek",
  slug: "summit-trek",
  guideId: "guide-1",
  active: true,
  deletedAt: null,
};

beforeEach(() => {
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.userFindFirst.mockResolvedValue({ role: "GUIDE", guide: { id: "guide-1", deletedAt: null } });
  mocks.tripFindUnique.mockResolvedValue(trip);
  mocks.hasPermission.mockReturnValue(false);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("setTripActiveAction", () => {
  it("rejects unauthenticated, malformed, and unowned requests before mutation", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(setTripActiveAction("trip-1", false)).rejects.toThrow("logged in");
    await expect(setTripActiveAction("", false)).rejects.toThrow("Missing trip");
    await expect(setTripActiveAction("trip-1", "false" as unknown as boolean)).rejects.toThrow("Invalid trip visibility");

    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.userFindFirst.mockResolvedValue({ role: "GUIDE", guide: { id: "guide-2", deletedAt: null } });
    await expect(setTripActiveAction("trip-1", false)).rejects.toThrow("only manage your own");

    expect(mocks.tripUpdate).not.toHaveBeenCalled();
  });

  it("lets an owning guide change visibility and invalidates public trip views", async () => {
    await setTripActiveAction("trip-1", false);

    expect(mocks.tripUpdate).toHaveBeenCalledWith({ where: { id: "trip-1" }, data: { active: false } });
    expect(mocks.logActivity).toHaveBeenCalledWith({
      userId: "user-1",
      action: "TRIP_DEACTIVATED",
      label: "Made a trip inactive",
      metadata: { tripId: "trip-1", title: "Summit trek" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/trips/summit-trek");
    expect(mocks.updateTag).toHaveBeenCalledWith("trips");
  });

  it("permits staff and makes idempotent requests a no-op", async () => {
    mocks.userFindFirst.mockResolvedValue({ role: "ADMIN", guide: null });
    mocks.hasPermission.mockReturnValue(true);
    mocks.tripFindUnique.mockResolvedValue({ ...trip, active: false });

    await setTripActiveAction("trip-1", false);

    expect(mocks.tripUpdate).not.toHaveBeenCalled();
    expect(mocks.logActivity).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
