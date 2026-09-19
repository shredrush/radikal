// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3bf6d13a6945e126900493c1f8f38aed@o4512108228640768.ingest.de.sentry.io/4512108250857552",

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

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
