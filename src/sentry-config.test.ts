import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { initMock, replayIntegrationMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
  replayIntegrationMock: vi.fn(() => ({})),
}));

vi.mock("@sentry/nextjs", () => ({
  captureRouterTransitionStart: vi.fn(),
  init: initMock,
  replayIntegration: replayIntegrationMock,
}));

beforeEach(() => {
  vi.resetModules();
  initMock.mockReset();
  replayIntegrationMock.mockClear();
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function expectPrivateConfiguration() {
  expect(initMock).toHaveBeenCalledWith(
    expect.objectContaining({
      tracesSampleRate: 0.1,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        graphQL: { document: false, variables: false },
        genAI: { inputs: false, outputs: false },
        databaseQueryData: false,
        stackFrameVariables: false,
      },
      beforeSend: expect.any(Function),
    }),
  );
}

describe("Sentry configuration", () => {
  it("initializes the server SDK with privacy-preserving collection", async () => {
    await import("../sentry.server.config");

    expectPrivateConfiguration();
  });

  it("initializes the edge SDK with privacy-preserving collection", async () => {
    await import("../sentry.edge.config");

    expectPrivateConfiguration();
  });

  it("initializes browser replay without network request bodies", async () => {
    await import("./instrumentation-client");

    expectPrivateConfiguration();
    expect(replayIntegrationMock).toHaveBeenCalledWith({ networkCaptureBodies: false });
  });

  it("removes request and user data as a final event safeguard", async () => {
    await import("../sentry.server.config");
    const config = initMock.mock.calls[0]?.[0] as {
      beforeSend: (event: { request?: unknown; user?: unknown }) => unknown;
    };
    const event = { request: { headers: { authorization: "secret" } }, user: { id: "user-1" } };

    expect(config.beforeSend(event)).toEqual({});
  });
});
