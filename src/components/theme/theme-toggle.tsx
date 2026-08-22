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
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/60 text-foreground/80 transition hover:border-primary/40 hover:text-foreground"
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
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/70 bg-background/95 px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.35)] transition-opacity duration-200 group-hover:opacity-100">
        {mounted ? (isDark ? "Light mode" : "Dark mode") : "Dark mode"}
      </span>
    </button>
  );
}
