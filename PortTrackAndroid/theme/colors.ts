/**
 * PortTrack Mobil Tema Sistemi (Dark & Light)
 * Web projesinin globals.css değişkenleriyle (%100) uyumludur.
 */

export type ThemeMode = 'dark' | 'light';

export const darkTheme = {
  isDark: true,
  bg: '#090d16',
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

  amber: {
    main: '#f59e0b',
    soft: 'rgba(245, 158, 11, 0.15)',
  },

  purple: {
    main: '#a855f7',
    soft: 'rgba(168, 85, 247, 0.15)',
  },
};

export const lightTheme = {
  isDark: false,
  bg: '#f7f8fc',
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

  amber: {
    main: '#d97706',
    soft: '#fef3c7',
  },

  purple: {
    main: '#9333ea',
    soft: '#f3e8ff',
  },
};

// Varsayılan uyumluluk sabiti (Dark)
export const colors = darkTheme;
