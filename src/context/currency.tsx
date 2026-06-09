"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Currency } from "@/lib/utils";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  toggle: () => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = "porttrack:currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("TRY");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "USD" || saved === "TRY") setCurrencyState(saved);
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    window.localStorage.setItem(STORAGE_KEY, c);
  };

  const toggle = () => setCurrency(currency === "TRY" ? "USD" : "TRY");

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, toggle }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

/** Iki para birimli bir degerden seciliyi getirir. */
export function pick(
  currency: Currency,
  values: { TRY: number; USD: number },
): number {
  return currency === "TRY" ? values.TRY : values.USD;
}
