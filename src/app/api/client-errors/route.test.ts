import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClientIp: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: mocks.getClientIp,
  rateLimit: mocks.rateLimit,
}));

import { POST } from "./route";

function request(body: string, headers?: HeadersInit) {
  return new Request("https://radikal.test/api/client-errors", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

beforeEach(() => {
  mocks.getClientIp.mockResolvedValue("203.0.113.1");
  mocks.rateLimit.mockReturnValue({ success: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/client-errors", () => {
  it("throttles reports before reading the request body", async () => {
    mocks.rateLimit.mockReturnValue({ success: false });

    const response = await POST(request('{"message":"boom"}'));

    expect(response.status).toBe(429);
  });

  it("rejects oversized reports before parsing them", async () => {
    const response = await POST(request("x".repeat(16_385)));

    expect(response.status).toBe(413);
  });

  it("normalizes control characters before logging a report", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request('{"message":"one\\ntwo"}'));

    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledWith("[client-error-boundary]", expect.objectContaining({ message: "one two" }));
  });
});
