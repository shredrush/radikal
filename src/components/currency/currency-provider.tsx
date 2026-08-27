"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from "@/lib/currency";

const STORAGE_KEY = "radikal-currency";

function subscribeToCurrencyPreference(onChange: () => void) {
  window.addEventListener("radikal-currency-change", onChange);
  return () => window.removeEventListener("radikal-currency-change", onChange);
}

function getStoredCurrency(): CurrencyCode | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && isCurrencyCode(stored) ? stored : null;
  } catch {
    return null;
  }
}

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
  // currency on Vercel) so server and first client render always match. The
  // persisted preference is read through useSyncExternalStore. The geo default
  // is never written to storage — only an explicit user selection is.
  //
  // Defensive: validate the prop against the currency allowlist before using
  // it, so a bad value can never reach the render tree.
  const storedCurrency = useSyncExternalStore(
    subscribeToCurrencyPreference,
    getStoredCurrency,
    () => null,
  );
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(null);
  const currency = selectedCurrency ?? storedCurrency ?? (isCurrencyCode(initialCurrency) ? initialCurrency : DEFAULT_CURRENCY);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setSelectedCurrency(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
      window.dispatchEvent(new Event("radikal-currency-change"));
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
