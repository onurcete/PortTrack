/**
 * PortTrack Android API İstemcisi
 * Vercel Next.js backend'imizle güvenli ve interceptor destekli iletişim sağlar.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'porttrack_session_token';

// API Adresi: Canlı Vercel Prod URL'si
const API_BASE_URL = 'https://port-track-ten.vercel.app/api';

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
      console.log(`🌐 [API Request] ${options.method || 'GET'} -> ${url}`);
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const status = response.status;
      console.log(`📡 [API Response] ${status} from ${url}`);

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
        let errorMsg = `Sunucu hatası (${status})`;
        if (typeof json?.error === 'string') {
          errorMsg = json.error;
        } else if (typeof json?.error?.message === 'string') {
          errorMsg = json.error.message;
        } else if (typeof json?.message === 'string') {
          errorMsg = json.message;
        } else if (json?.error && typeof json.error === 'object') {
          errorMsg = JSON.stringify(json.error);
        }

        return {
          data: null,
          error: errorMsg,
          status,
        };
      }

      // Eğer response içinde token veya set-cookie geldiyse yakala
      if (json?.token && typeof json.token === 'string') {
        await this.setToken(json.token);
      }

      return {
        data: json,
        error: null,
        status,
      };
    } catch (err: any) {
      console.error(`API Error [${endpoint}]:`, err);
      const msg = typeof err?.message === 'string' ? err.message : 'Bağlantı hatası oluştu.';
      return {
        data: null,
        error: `Sunucuya bağlanılamadı: ${msg}`,
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

  patch<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiService();
