"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  COLOR_THEME_STORAGE_KEY,
  DEFAULT_COLOR_THEME,
  isColorThemeId,
} from "@/lib/theme-presets";

type ColorThemeContextValue = {
  colorTheme: string;
  setColorTheme: (id: string) => void;
};

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null);

function applyTheme(id: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (id === DEFAULT_COLOR_THEME) {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", id);
  }
}

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<string>(DEFAULT_COLOR_THEME);

  useEffect(() => {
    // Hydrate from storage. A tiny inline script in the root layout already
    // applies the saved `data-theme` pre-paint, so this only needs to bring
    // React state in sync (and guard against an invalid stored value).
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    } catch {
      // Storage unavailable — keep the default.
    }
    if (stored && isColorThemeId(stored)) {
      setColorThemeState(stored);
      applyTheme(stored);
    }
  }, []);

  const setColorTheme = useCallback((id: string) => {
    if (!isColorThemeId(id)) return;
    setColorThemeState(id);
    applyTheme(id);
    try {
      window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, id);
    } catch {
      // Ignore storage failures; the in-memory selection still applies.
    }
  }, []);

  const value = useMemo(
    () => ({ colorTheme, setColorTheme }),
    [colorTheme, setColorTheme],
  );

  return (
    <ColorThemeContext.Provider value={value}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme(): ColorThemeContextValue {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error("useColorTheme must be used within a ColorThemeProvider");
  }
  return context;
}
