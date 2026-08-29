import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { darkTheme, lightTheme, ThemeMode } from '../theme/colors';

const THEME_KEY = 'porttrack_theme_mode';

interface ThemeState {
  mode: ThemeMode;
  theme: typeof darkTheme;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'dark',
  theme: darkTheme,

  toggleTheme: async () => {
    const newMode: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    const newTheme = newMode === 'dark' ? darkTheme : lightTheme;
    try {
      await SecureStore.setItemAsync(THEME_KEY, newMode);
    } catch {}
    set({ mode: newMode, theme: newTheme });
  },

  setTheme: async (mode: ThemeMode) => {
    const newTheme = mode === 'dark' ? darkTheme : lightTheme;
    try {
      await SecureStore.setItemAsync(THEME_KEY, mode);
    } catch {}
    set({ mode, theme: newTheme });
  },

  loadTheme: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      if (saved === 'light' || saved === 'dark') {
        set({
          mode: saved,
          theme: saved === 'dark' ? darkTheme : lightTheme,
        });
      }
    } catch {}
  },
}));
