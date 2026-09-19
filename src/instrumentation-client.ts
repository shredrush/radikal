// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3bf6d13a6945e126900493c1f8f38aed@o4512108228640768.ingest.de.sentry.io/4512108250857552",

  integrations: [Sentry.replayIntegration({ networkCaptureBodies: false })],

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

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
  beforeSend(event) {
    delete event.request;
    delete event.user;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
