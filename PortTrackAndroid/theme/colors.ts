/**
 * PortTrack Mobil Tema Sistemi (Dark & Light)
 * Web projesinin globals.css değişkenleriyle (%100) uyumludur.
 */

export type ThemeMode = 'dark' | 'light';

export const darkTheme = {
  isDark: true,
  bg: {
    primary: '#090d16',
    secondary: '#111726',
    tertiary: '#1b2234',
    card: '#111726',
    elevated: '#202940',
    border: '#242d42',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
  },
  surface: '#111726',
  surfaceMuted: '#1b2234',
  surfaceHover: '#202940',
  border: '#242d42',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',

  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    muted: '#64748b',
    profit: '#22c55e',
    loss: '#f43f5e',
    positive: '#22c55e',
    negative: '#f43f5e',
  },

  brand: {
    primary: '#6366f1',
    strong: '#818cf8',
    soft: 'rgba(99, 102, 241, 0.15)',
  },

  profit: {
    main: '#22c55e',
    soft: 'rgba(34, 197, 94, 0.12)',
  },

  loss: {
    main: '#f43f5e',
    soft: 'rgba(244, 63, 94, 0.12)',
  },

  emerald: {
    50: '#ecfdf5',
    400: '#22c55e',
    500: '#10b981',
    600: '#059669',
    bgSubtle: 'rgba(34, 197, 94, 0.12)',
  },

  rose: {
    50: '#fff1f2',
    400: '#f43f5e',
    500: '#e11d48',
    600: '#be123c',
    bgSubtle: 'rgba(244, 63, 94, 0.12)',
  },

  blue: {
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    bgSubtle: 'rgba(59, 130, 246, 0.12)',
  },

  amber: {
    main: '#f59e0b',
    400: '#fbbf24',
    500: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.15)',
    bgSubtle: 'rgba(245, 158, 11, 0.15)',
  },

  purple: {
    main: '#a855f7',
    400: '#c084fc',
    500: '#a855f7',
    soft: 'rgba(168, 85, 247, 0.15)',
    bgSubtle: 'rgba(168, 85, 247, 0.15)',
  },
};

export const lightTheme = {
  isDark: false,
  bg: {
    primary: '#f7f8fc',
    secondary: '#ffffff',
    tertiary: '#f1f3f9',
    card: '#ffffff',
    elevated: '#e9ecf5',
    border: '#e6e8f0',
    borderSubtle: 'rgba(0, 0, 0, 0.06)',
  },
  surface: '#ffffff',
  surfaceMuted: '#f1f3f9',
  surfaceHover: '#e9ecf5',
  border: '#e6e8f0',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',

  text: {
    primary: '#1a1d2b',
    secondary: '#4b5563',
    muted: '#6b7280',
    profit: '#16a34a',
    loss: '#e11d48',
    positive: '#16a34a',
    negative: '#e11d48',
  },

  brand: {
    primary: '#6366f1',
    strong: '#4f46e5',
    soft: '#eef0ff',
  },

  profit: {
    main: '#16a34a',
    soft: '#e7f7ee',
  },

  loss: {
    main: '#e11d48',
    soft: '#fdeaf0',
  },

  emerald: {
    50: '#ecfdf5',
    400: '#16a34a',
    500: '#10b981',
    600: '#059669',
    bgSubtle: '#e7f7ee',
  },

  rose: {
    50: '#fff1f2',
    400: '#e11d48',
    500: '#be123c',
    600: '#9f1239',
    bgSubtle: '#fdeaf0',
  },

  blue: {
    400: '#3b82f6',
    500: '#2563eb',
    600: '#1d4ed8',
    bgSubtle: '#eff6ff',
  },

  amber: {
    main: '#d97706',
    400: '#f59e0b',
    500: '#d97706',
    soft: '#fef3c7',
    bgSubtle: '#fef3c7',
  },

  purple: {
    main: '#9333ea',
    400: '#a855f7',
    500: '#9333ea',
    soft: '#f3e8ff',
    bgSubtle: '#f3e8ff',
  },
};

// Geriye dönük tam uyumluluk nesnesi (Dark varsayılan)
export const colors = darkTheme;
