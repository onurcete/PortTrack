/**
 * PortTrack Android Para Birimi Global State Yönetimi (Zustand)
 * Web'deki useCurrency ile %100 uyumlu, anında ve senkron geçiş sağlar.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const CURRENCY_KEY = 'porttrack_currency';

interface CurrencyState {
  currency: 'TRY' | 'USD';
  isTRY: boolean;
  setCurrency: (currency: 'TRY' | 'USD') => void;
  toggleCurrency: () => void;
  loadCurrency: () => Promise<void>;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: 'TRY',
  isTRY: true,

  setCurrency: (currency: 'TRY' | 'USD') => {
    set({ currency, isTRY: currency === 'TRY' });
    try {
      SecureStore.setItemAsync(CURRENCY_KEY, currency).catch(() => {});
    } catch {}
  },

  toggleCurrency: () => {
    const next: 'TRY' | 'USD' = get().currency === 'TRY' ? 'USD' : 'TRY';
    set({ currency: next, isTRY: next === 'TRY' });
    try {
      SecureStore.setItemAsync(CURRENCY_KEY, next).catch(() => {});
    } catch {}
  },

  loadCurrency: async () => {
    try {
      const saved = await SecureStore.getItemAsync(CURRENCY_KEY);
      if (saved === 'TRY' || saved === 'USD') {
        set({ currency: saved, isTRY: saved === 'TRY' });
      }
    } catch {}
  },
}));
