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

import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from "@/lib/currency";

const STORAGE_KEY = "radikal-currency";

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  children,
  initialCurrency = DEFAULT_CURRENCY,
}: {
  children: ReactNode;
  initialCurrency?: CurrencyCode;
}) {
  // Start on the server-supplied default (usually INR, or the geo-detected
  // currency on Vercel) so server and first client render always match, then
  // hydrate the persisted preference below. The geo default is never written
  // to storage — only an explicit user selection is.
  //
  // Defensive: validate the prop against the currency allowlist before using
  // it, so a bad value can never reach the render tree.
  const [currency, setCurrencyState] = useState<CurrencyCode>(
    isCurrencyCode(initialCurrency) ? initialCurrency : DEFAULT_CURRENCY,
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && isCurrencyCode(stored)) {
        setCurrencyState(stored);
      }
    } catch {
      // Storage can be unavailable (private browsing / disabled) — ignore.
    }
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Ignore storage failures; the in-memory selection still applies.
    }
  }, []);

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
