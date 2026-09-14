import Link from "next/link";
import { Fragment } from "react";
import { ArrowLeft, ClipboardList, Compass, UserRoundPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GuideBoardStats } from "@/components/guides/guide-board-stats";

const GUIDE_BOARD_SECTIONS = [
  {
    key: "profile",
    href: "/guide-board/profile",
    label: "Edit public profile",
    description: "Update your public details and media.",
  },
  {
    key: "bookings",
    href: "/guide-board/bookings",
    label: "My Bookings",
    description: "Review traveller reservations",
  },
  {
    key: "trips",
    href: "/guide-board/trips",
    label: "My trips",
    description: "Create and manage your trips",
  },
] as const;

export type GuideBoardSection = (typeof GUIDE_BOARD_SECTIONS)[number]["key"];

export function GuideBoardHeader({
  title,
  description,
  active,
  guideId,
}: {
  title: string;
  description: string;
  active: GuideBoardSection;
  guideId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/profile"
        prefetch={false}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        back to profile
      </Link>

      <header className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:items-start">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Guide board
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="text-sm leading-7 text-muted-foreground">{description}</p>

            <GuideBoardStats guideId={guideId} />
          </div>

          <nav
            className="grid grid-cols-2 gap-x-3 gap-y-4 lg:self-stretch lg:grid-rows-[auto_1fr_auto]"
            aria-label="Guide board sections"
          >
            {GUIDE_BOARD_SECTIONS.map((section) => (
              <Fragment key={section.key}>
                <div
                  className={
                    section.key === "profile" ? "col-start-2" : "lg:row-start-3"
                  }
                >
                  <Button
                    variant={section.key === active ? "default" : "outline"}
                    size="sm"
                    className="w-full max-w-full gap-1 rounded-full border-2 border-black px-2 text-[0.625rem] sm:gap-2 sm:px-3 sm:text-sm dark:border-white"
                    nativeButton={false}
                    render={<Link href={section.href} prefetch={false} />}
                  >
                    {section.key === "profile" ? (
                      <UserRoundPen className="h-3.5 w-3.5" />
                    ) : section.key === "trips" ? (
                      <Compass className="h-3.5 w-3.5" />
                    ) : (
                      <ClipboardList className="h-3.5 w-3.5" />
                    )}
                    {section.label}
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                </div>
                {section.key === "profile" ? (
                  <div className="col-start-1 row-start-1" aria-hidden="true" />
                ) : null}
              </Fragment>
            ))}
          </nav>
        </div>
      </header>
    </div>
  );
}
