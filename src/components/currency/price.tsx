"use client";

import { formatPrice } from "@/lib/currency";

import { useCurrency } from "./currency-provider";

export function Price({ amount, className }: { amount: number; className?: string }) {
  const { currency } = useCurrency();
  return <span className={className}>{formatPrice(amount, currency)}</span>;
}
