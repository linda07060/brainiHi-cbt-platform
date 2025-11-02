import axios, { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage 'auth' object (token field)
// Use InternalAxiosRequestConfig so the interceptor signature matches axios types.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
    if (raw) {
      const auth = JSON.parse(raw);
      const token = auth?.token || auth?.access_token || auth?.accessToken;
      if (token) {
        // Ensure headers is an AxiosHeaders instance to satisfy TypeScript and to use .set()
        if (!config.headers || typeof (config.headers as any).set !== 'function') {
          // copy existing headers into a new AxiosHeaders instance (safe for both plain objects and AxiosHeaders)
          config.headers = new AxiosHeaders(config.headers as any);
        }

        // Add Authorization header in a type-safe way
        (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
      }
    }
  } catch (err) {
    // ignore parse errors or localStorage access errors
  }
  return config;
});

export default api;