import axios from 'axios';
import type { AxiosRequestConfig, AxiosRequestHeaders } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage 'auth' object (token field)
api.interceptors.request.use((config: AxiosRequestConfig) => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
    if (raw) {
      const auth = JSON.parse(raw);
      const token = auth?.token || auth?.access_token;
      if (token) {
        // Merge existing headers and ensure the type matches AxiosRequestHeaders
        const existing = (config.headers as AxiosRequestHeaders) || {};
        config.headers = {
          ...existing,
          Authorization: `Bearer ${token}`,
        } as AxiosRequestHeaders;
      }
    }
  } catch (err) {
    // ignore
  }
  return config;
});

export default api;