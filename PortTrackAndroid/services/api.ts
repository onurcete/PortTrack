/**
 * PortTrack Android API İstemcisi
 * Vercel Next.js backend'imizle güvenli ve interceptor destekli iletişim sağlar.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'porttrack_session_token';

// API Adresi: .env içerisinden veya varsayılan Vercel adresinden okunur
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://porttrack-app.vercel.app/api';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/$/, '');
  }

  /**
   * Cihaz hafızasındaki oturum anahtarını (JWT/Session) getirir
   */
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Oturum anahtarını şifreli saklar
   */
  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (e) {
      console.error('Token kaydedilemedi:', e);
    }
  }

  /**
   * Oturum anahtarını siler (Çıkış Yap)
   */
  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error('Token silinemedi:', e);
    }
  }

  /**
   * Merkezi HTTP İstek Yöneticisi
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: string | null; status: number }> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const token = await this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['Cookie'] = `pt_session=${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const status = response.status;

      // 401 Unauthorized durumunda oturumu temizle
      if (status === 401) {
        await this.removeToken();
        return {
          data: null,
          error: 'Oturum süreniz doldu, lütfen tekrar giriş yapın.',
          status,
        };
      }

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          data: null,
          error: json?.error || json?.message || `Sunucu hatası (${status})`,
          status,
        };
      }

      return {
        data: json,
        error: null,
        status,
      };
    } catch (err: any) {
      console.error(`API Error [${endpoint}]:`, err);
      return {
        data: null,
        error: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.',
        status: 0,
      };
    }
  }

  // Kolaylık metodları
  get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiService();
