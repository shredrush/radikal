"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  DEFAULT_CURRENCY,
  currencyForCountry,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency";

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
  // The server always renders with the default currency so the root layout can
  // stay static; the visitor's country is looked up client-side (below) and the
  // persisted preference is read through useSyncExternalStore. Neither the geo
  // default nor the server default is written to storage — only an explicit
  // user selection is.
  //
  // Defensive: validate the prop against the currency allowlist before using
  // it, so a bad value can never reach the render tree.
  const storedCurrency = useSyncExternalStore(
    subscribeToCurrencyPreference,
    getStoredCurrency,
    () => null,
  );
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(null);

  // The server always renders with the default currency (INR) so the root
  // layout stays static. The visitor's country is looked up client-side from a
  // lightweight API route, then used as the default — but only when the user
  // hasn't already picked a currency. The geo-derived default is never written
  // to storage.
  const [geoCurrency, setGeoCurrency] = useState<CurrencyCode>(() =>
    isCurrencyCode(initialCurrency) ? initialCurrency : DEFAULT_CURRENCY,
  );

  useEffect(() => {
    if (selectedCurrency || storedCurrency) return;

    let cancelled = false;
    fetch("/api/geo", { headers: { accept: "application/json" } })
      .then((res) => (res.ok ? (res.json() as Promise<{ country?: string | null }>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        const code = currencyForCountry(data.country);
        if (code) setGeoCurrency(code);
      })
      .catch(() => {
        // Ignore — geo lookup is best-effort and never blocks rendering.
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCurrency, storedCurrency]);

  const currency =
    selectedCurrency ?? storedCurrency ?? geoCurrency;

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
