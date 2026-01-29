import axios from "axios";

/**
 * Central axios instance used across the frontend.
 * - withCredentials: true so cookie-based auth is included for cross-origin calls.
 * - baseURL: uses NEXT_PUBLIC_API_URL when provided; otherwise leaves requests relative so fallback to Next.js proxy works.
 *
 * The request interceptor attempts to attach an Authorization header from localStorage "auth" (if present)
 * when no Authorization header is already set on the request. This keeps behavior consistent whether code
 * passes token explicitly or relies on the cookie + SSE query fallback.
 */
const baseURL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "") || "";

const api = axios.create({
  baseURL: baseURL || undefined,
  withCredentials: true,
});

// Attach token from localStorage 'auth' if request doesn't already include Authorization header.
// This helps pages that don't have direct access to the auth context.
api.interceptors.request.use((config) => {
  try {
    if (!config.headers) config.headers = {};
    const hasAuth = Boolean(
      (config.headers as any).Authorization ||
        (config.headers as any)["authorization"] ||
        (config.headers as any)["Authorization"]
    );
    if (!hasAuth && typeof window !== "undefined") {
      const raw = localStorage.getItem("auth");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const token =
            parsed?.token ?? parsed?.access_token ?? parsed?.accessToken ?? null;
          if (token) {
            (config.headers as any).Authorization = `Bearer ${token}`;
          }
        } catch {
          // ignore malformed auth entry
        }
      }
    }
  } catch {
    // noop
  }
  return config;
});

// Response interceptor to handle authentication errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 401 ||
      (typeof error?.response?.data?.message === "string" &&
        error.response.data.message.toLowerCase().includes("authentication required"))
    ) {
      try {
        localStorage.removeItem("auth");
      } catch {}
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { api };