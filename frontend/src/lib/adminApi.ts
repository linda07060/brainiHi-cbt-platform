import axios from 'axios';

// Client-side base URL comes from NEXT_PUBLIC_API_URL
// Server-side fallback (when running SSR tasks) falls back to http://localhost:4001
const baseUrl =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'
    : process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

const adminApi = axios.create({
  baseURL: baseUrl,
  withCredentials: true, // send cookies if backend uses cookie auth
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Prevent GET caching by default
adminApi.defaults.headers = adminApi.defaults.headers || {};
adminApi.defaults.headers.common = adminApi.defaults.headers.common || {};
adminApi.defaults.headers.common['Cache-Control'] = 'no-cache';
adminApi.defaults.headers.common['Pragma'] = 'no-cache';
adminApi.defaults.headers.common['Expires'] = '0';

// Ensure a safe global flag exists so UI can detect repeated 401s
try {
  if (typeof window !== 'undefined') {
    (window as any).__adminApiUnauthorized = (window as any).__adminApiUnauthorized || false;
  }
} catch {
  // ignore server-side or proxy environments
}

// Attach token (if present) from adminAuth or auth in localStorage
adminApi.interceptors.request.use((config: any) => {
  try {
    const raw =
      typeof window !== 'undefined'
        ? localStorage.getItem('adminAuth') || localStorage.getItem('auth')
        : null;
    if (raw) {
      const auth = JSON.parse(raw);
      const token = auth?.token || auth?.access_token || auth?.accessToken;
      if (token) {
        if (!config.headers) config.headers = {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    // ignore parse/localStorage errors
  }
  return config;
});

// Response interceptor: mark global unauthorized flag on 401 and dispatch events.
// Also clear the flag on a successful admin response so the UI can retry if appropriate.
adminApi.interceptors.response.use(
  (resp) => {
    try {
      if (typeof window !== 'undefined' && (window as any).__adminApiUnauthorized) {
        (window as any).__adminApiUnauthorized = false;
        try { window.dispatchEvent(new CustomEvent('adminApi:authorized', { detail: { status: 200 } })); } catch {}
      }
    } catch {
      // ignore
    }
    return resp;
  },
  (err) => {
    try {
      const status = err?.response?.status;
      if (status === 401) {
        try {
          if (typeof window !== 'undefined') (window as any).__adminApiUnauthorized = true;
        } catch {}
        try { window.dispatchEvent(new CustomEvent('adminApi:unauthorized', { detail: { status } })); } catch {}
      }
    } catch {
      // swallow
    }
    return Promise.reject(err);
  }
);

export default adminApi;