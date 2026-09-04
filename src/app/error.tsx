"use client";

import { useEffect } from "react";
import Link from "next/link";

// App-wide safety net: any page that throws (a DB outage, an unexpected error,
// etc.) renders this friendly fallback instead of a raw 500 crash.
export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled page error", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-8xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        We couldn&apos;t load this page
      </h1>
      <p className="max-w-md text-sm leading-7 text-muted-foreground">
        An unexpected error interrupted your request. Please try again — our
        team has been notified.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={unstable_retry}
          className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
