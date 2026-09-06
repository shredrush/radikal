"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";

import { createCustomDateEnquiryAction } from "@/lib/actions/custom-trips";
import { toDateInput } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function CustomDateEnquiry({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function expandForBookingCta() {
      setIsExpanded(true);
      window.requestAnimationFrame(() => {
        document.getElementById("custom-date-enquiry")?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }

    function expandForBookingHash() {
      if (window.location.hash === "#custom-date-enquiry") {
        expandForBookingCta();
      }
    }

    expandForBookingHash();
    window.addEventListener("hashchange", expandForBookingHash);
    window.addEventListener("open-custom-date-enquiry", expandForBookingCta);
    return () => {
      window.removeEventListener("hashchange", expandForBookingHash);
      window.removeEventListener("open-custom-date-enquiry", expandForBookingCta);
    };
  }, []);

  function sendEnquiry() {
    setError(null);
    if (!startDate) {
      setError("Choose your preferred start date.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createCustomDateEnquiryAction({ tripId, startDate });
        if (!result.success) {
          setError(result.error);
          if (result.loginRequired) {
            router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
          }
          return;
        }
        router.push(`/custom-trip/${result.requestId}`);
      } catch {
        setError("Could not send your enquiry. Please try again.");
      }
    });
  }

  return (
    <div id="custom-date-enquiry" className="border-t border-border/60 pt-4">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={() => {
          setIsExpanded((current) => !current);
          setError(null);
        }}
        className="ml-auto flex w-fit items-center gap-2 text-right text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-blue-400 dark:hover:text-blue-300"
      >
        Enquire for custom dates
        <ChevronDown className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded ? (
        <div className="mt-4 rounded-2xl border border-blue-200/80 bg-blue-50/50 p-3 dark:border-blue-500/20 dark:bg-blue-500/5">
          <label htmlFor="custom-trip-start-date" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarDays className="size-4 text-blue-600 dark:text-blue-400" />
            Preferred start date
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="custom-trip-start-date"
              type="date"
              min={toDateInput(new Date())}
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setError(null);
              }}
              className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
            />
            <Button
              type="button"
              disabled={!startDate || isPending}
              onClick={sendEnquiry}
              className="rounded-xl bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-60"
            >
              {isPending ? "Sending..." : "Send enquiry"}
            </Button>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            We&apos;ll open a dedicated chat with our support team using this trip&apos;s details.
          </p>
          {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
