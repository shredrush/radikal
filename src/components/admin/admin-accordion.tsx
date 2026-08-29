"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type AdminAccordionItem = {
  key: string;
  header: React.ReactNode;
  children: React.ReactNode;
};

export function AdminAccordion({ items }: { items: AdminAccordionItem[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {items.map((item) => {
        const open = openKey === item.key;
        return (
          <section
            key={item.key}
            className="[--card-spacing:--spacing(8)] overflow-hidden bg-background/95 text-sm text-card-foreground shadow-[0_20px_60px_-35px_rgba(0,0,0,0.2)] ring-1 ring-foreground/5"
          >
            <button
              type="button"
              onClick={() => setOpenKey(open ? null : item.key)}
              aria-expanded={open}
              className="flex w-full items-start justify-between gap-4 border-b border-border/70 bg-muted/20 px-(--card-spacing) py-(--card-spacing) text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/10"
            >
              <div className="min-w-0 flex-1">{item.header}</div>
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
                <div className="px-(--card-spacing) pb-(--card-spacing) pt-6">{item.children}</div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
