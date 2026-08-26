"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={mounted ? isDark : false}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="group relative inline-flex h-9 w-[4.25rem] items-center rounded-full border border-border/70 bg-background/60 transition hover:border-primary/40"
    >
      {/* Inactive icon sits in the gap opposite the sliding knob */}
      <span
        className={`pointer-events-none absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-foreground/60 transition-all duration-300 ${
          mounted && isDark ? "left-1" : "right-1"
        }`}
      >
        {mounted ? (
          isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )
        ) : (
          <span className="h-4 w-4" />
        )}
      </span>

      {/* Sliding knob carrying the active icon */}
      <span
        className={`absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background text-foreground shadow-sm transition-transform duration-300 ease-in-out ${
          mounted && isDark ? "translate-x-[calc(100%+0.5rem)]" : "translate-x-1"
        }`}
      >
        {mounted ? (
          isDark ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )
        ) : (
          <span className="h-4 w-4" />
        )}
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/70 bg-background/95 px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.35)] transition-opacity duration-200 group-hover:opacity-100">
        {mounted ? (isDark ? "Light mode" : "Dark mode") : "Dark mode"}
      </span>
    </button>
  );
}
