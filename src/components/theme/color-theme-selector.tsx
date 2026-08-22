"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";

import { COLOR_THEMES } from "@/lib/theme-presets";
import { cn } from "@/lib/utils";

import { useColorTheme } from "./color-theme-provider";

export function ColorThemeSelector() {
  const { colorTheme, setColorTheme } = useColorTheme();
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select color theme"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground/80 transition hover:border-primary/40 hover:text-foreground",
          open && "border-primary/40 text-foreground",
        )}
      >
        <Palette className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border/70 bg-background/95 p-1 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)] backdrop-blur">
          {COLOR_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => {
                setColorTheme(theme.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-primary/10 hover:text-primary",
                theme.id === colorTheme && "bg-primary/10 text-primary",
              )}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full ring-1 ring-border/70"
                style={{ backgroundColor: theme.swatch }}
              />
              <span className="flex-1 truncate">{theme.label}</span>
              {theme.id === colorTheme ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
