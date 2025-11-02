import axios, { AxiosHeaders } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage 'auth' object (token field)
// Use InternalAxiosRequestConfig for the interceptor to match axios types.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
    if (raw) {
      const auth = JSON.parse(raw);
      const token = auth?.token || auth?.access_token;
      if (token) {
        // Ensure headers is an AxiosHeaders instance so typing and methods are correct.
        // If headers is missing or not an AxiosHeaders instance, create a new AxiosHeaders,
        // copying any existing header entries so we don't lose them.
        if (!config.headers || typeof (config.headers as any).set !== 'function') {
          config.headers = new AxiosHeaders(config.headers as any);
        }

        // Use AxiosHeaders.set to safely add the Authorization header
        (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
      }
    }
  } catch (err) {
    // ignore
  }
  return config;
});

export default api;