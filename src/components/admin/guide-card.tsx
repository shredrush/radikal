"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/format";
import { AdminGuideForm, type GuideFormData } from "@/components/admin/admin-guide-form";

export type GuideCardData = GuideFormData & { tripsCount: number };

export function GuideCard({ guide }: { guide: GuideCardData }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/95 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/10"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{guide.name}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {guide.location} · {guide.tripsCount} {pluralize(guide.tripsCount, "trip")} linked · /{guide.username ?? "no username"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/70 px-4 pb-5 pt-5">
            <AdminGuideForm guide={guide} />
          </div>
        </div>
      </div>
    </li>
  );
}
