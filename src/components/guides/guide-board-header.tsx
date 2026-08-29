import Link from "next/link";
import { ArrowLeft, ClipboardList, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GuideBoardStats } from "@/components/guides/guide-board-stats";

const GUIDE_BOARD_SECTIONS = [
  { key: "trips", href: "/guide-board/trips", label: "My trips" },
  { key: "bookings", href: "/guide-board/bookings", label: "My Bookings" },
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
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </Link>

      <header className="rounded-[2rem] border border-border/80 bg-background/90 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.25)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Guide board
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-wide text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="text-sm leading-7 text-muted-foreground">{description}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              {GUIDE_BOARD_SECTIONS.map((section) => (
                <Button
                  key={section.key}
                  variant={section.key === active ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  nativeButton={false}
                  render={<Link href={section.href} />}
                >
                  {section.key === "trips" ? (
                    <Compass className="h-3.5 w-3.5" />
                  ) : (
                    <ClipboardList className="h-3.5 w-3.5" />
                  )}
                  {section.label}
                </Button>
              ))}
            </div>
          </div>

          <GuideBoardStats guideId={guideId} />
        </div>
      </header>
    </div>
  );
}
