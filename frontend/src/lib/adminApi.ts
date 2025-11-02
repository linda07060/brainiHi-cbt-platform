import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage 'auth' object (token field)
// Use `any` for the interceptor param so the code compiles with different axios typings on CI.
api.interceptors.request.use((config: any) => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
    if (raw) {
      const auth = JSON.parse(raw);
      const token = auth?.token || auth?.access_token || auth?.accessToken;
      if (token) {
        // runtime: ensure headers exists and set Authorization
        if (!config.headers) config.headers = {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    // ignore localStorage/parse errors
  }
  return config;
});

export default api;