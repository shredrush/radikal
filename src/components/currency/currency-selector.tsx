"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { CURRENCIES, getCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

import { useCurrency } from "./currency-provider";

export function CurrencySelector({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const current = getCurrency(currency);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select currency"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 text-xs font-semibold text-foreground/80 transition hover:border-primary/40 hover:text-foreground",
          open && "border-primary/40 text-foreground",
          className,
        )}
      >
        <span className="font-heading text-base leading-none tracking-wide">{current.symbol}</span>
        <span className="text-base leading-none">{current.flag}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border/70 bg-background/95 bg-app-gradient-subtle p-1 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] backdrop-blur">
          <div>
            {CURRENCIES.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setCurrency(option.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-primary/10 hover:text-primary",
                  option.code === currency && "bg-primary/10 text-primary",
                )}
              >
                <span className="w-7 shrink-0 text-left font-heading text-base font-semibold">{option.symbol}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xs text-muted-foreground">{option.name}</span>
                  <span className="text-base leading-none">{option.flag}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
