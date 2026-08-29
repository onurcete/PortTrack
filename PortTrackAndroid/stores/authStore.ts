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
      const res = await api.post<{ user: User; token?: string }>('/auth/login', {
        email,
        password,
      });

      if (res.data?.user) {
        // Eğer backend token döndürdüyse kaydet
        if (res.data.token) {
          await api.setToken(res.data.token);
        }
        set({
          user: res.data.user,
          token: res.data.token || 'logged-in',
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({
          isLoading: false,
          error: res.error || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.',
        });
        return false;
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: 'Bir hata oluştu. Lütfen tekrar deneyin.',
      });
      return false;
    }
  },

  loginDemo: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post<{ user: User; token?: string }>('/auth/demo');
      if (res.data?.user) {
        if (res.data.token) {
          await api.setToken(res.data.token);
        }
        set({
          user: res.data.user,
          token: res.data.token || 'demo-token',
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({
          isLoading: false,
          error: res.error || 'Demo girişi yapılamadı.',
        });
        return false;
      }
    } catch {
      set({
        isLoading: false,
        error: 'Demo girişi sırasında bağlantı hatası oluştu.',
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
