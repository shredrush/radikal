"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/format";
import type { GuideFormData } from "@/components/admin/admin-guide-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AdminGuideForm = dynamic(
  () => import("@/components/admin/admin-guide-form").then((module) => module.AdminGuideForm),
  { ssr: false, loading: () => null },
);

export type GuideCardData = GuideFormData & { tripsCount: number };

export function GuideCard({ guide }: { guide: GuideCardData }) {
  const [open, setOpen] = useState(false);
  const initials = guide.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return (
    <li className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/95 shadow-sm">
      <div className="flex w-full items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/20">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar size="lg">
            {guide.photo ? <AvatarImage src={guide.photo} alt={`${guide.name}'s profile picture`} /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate font-semibold text-foreground">{guide.name}</p>
              {guide.username ? (
                <a
                  href={`/${guide.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${guide.name}'s public profile in a new tab`}
                  title="Open public profile in a new tab"
                  className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {guide.location} · {guide.tripsCount} {pluralize(guide.tripsCount, "trip")} linked · /{guide.username ?? "no username"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${guide.name}'s details`}
          className="rounded-sm p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/70 px-4 pb-5 pt-5">
            {open ? <AdminGuideForm guide={guide} onSaved={() => setOpen(false)} /> : null}
          </div>
        </div>
      </div>
    </li>
  );
}
