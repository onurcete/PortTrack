/**
 * PortTrack Android Kimlik Doğrulama State Yönetimi (Zustand)
 */

import { create } from 'zustand';
import { api } from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Eylemler
  login: (email: string, password?: string) => Promise<boolean>;
  loginDemo: () => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await api.getToken();
      if (!token) {
        set({ user: null, token: null, isLoading: false, isInitialized: true });
        return;
      }

      const res = await api.get<{ user: User }>('/auth/me');
      if (res.data?.user) {
        set({
          user: res.data.user,
          token,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        await api.removeToken();
        set({ user: null, token: null, isLoading: false, isInitialized: true });
      }
    } catch {
      set({ user: null, token: null, isLoading: false, isInitialized: true });
    }
  },

  login: async (email: string, password?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ ok?: boolean; user?: User; token?: string }>('/auth/login', {
        email,
        password,
      });

      if (res.data?.user || res.data?.ok) {
        if (res.data.token) {
          await api.setToken(res.data.token);
        }

        // Eğer user objesi dönmediyse /auth/me'den çek
        let currentUser = res.data.user;
        if (!currentUser) {
          const meRes = await api.get<{ user: User }>('/auth/me');
          currentUser = meRes.data?.user;
        }

        set({
          user: currentUser || {
            id: 'current-user',
            email,
            role: 'USER',
            isDemo: false,
            theme: 'dark',
            defaultCurrency: 'TRY',
            dailyDigestEnabled: false,
          },
          token: res.data.token || 'logged-in',
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        const errorText =
          typeof res.error === 'string'
            ? res.error
            : (res.error as any)?.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.';
        set({
          isLoading: false,
          error: errorText,
        });
        return false;
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: typeof err?.message === 'string' ? err.message : 'Giriş sırasında hata oluştu.',
      });
      return false;
    }
  },

  loginDemo: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ ok?: boolean; user?: User; token?: string }>('/auth/demo');
      if (res.data?.user || res.data?.ok) {
        if (res.data.token) {
          await api.setToken(res.data.token);
        }

        let currentUser = res.data.user;
        if (!currentUser) {
          const meRes = await api.get<{ user: User }>('/auth/me');
          currentUser = meRes.data?.user;
        }

        set({
          user: currentUser || {
            id: 'demo-user',
            email: 'demo@porttrack.app',
            name: 'Demo Kullanıcı',
            role: 'USER',
            isDemo: true,
            theme: 'dark',
            defaultCurrency: 'TRY',
            dailyDigestEnabled: false,
          },
          token: res.data.token || 'demo-token',
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        const errorText =
          typeof res.error === 'string'
            ? res.error
            : (res.error as any)?.message || 'Demo girişi yapılamadı.';
        set({
          isLoading: false,
          error: errorText,
        });
        return false;
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: typeof err?.message === 'string' ? err.message : 'Demo girişi sırasında bağlantı hatası oluştu.',
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    await api.removeToken();
    set({ user: null, token: null, error: null });
  },
}));
