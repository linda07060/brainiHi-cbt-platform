import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

type AuthShape = { token?: string | null; user?: any } | null;

interface AuthContextValue {
  user: any | null;
  token: string | null;
  setUser: (u: AuthShape) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setUser: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  logout: () => {},
});

function normalizeAuth(input: any): { token: string | null; user: any | null } {
  if (!input) return { token: null, user: null };
  if (typeof input === "object" && (input.token || input.access_token || input.user)) {
    const token = (input.token as string) || (input.access_token as string) || null;
    const user = input.user ?? (() => {
      const copy = { ...input };
      delete (copy as any).token;
      delete (copy as any).access_token;
      return Object.keys(copy).length ? copy : null;
    })();
    return { token, user };
  }
  return { token: null, user: input };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<{ token: string | null; user: any | null }>(() => {
    try {
      if (typeof window === "undefined") return { token: null, user: null };
      const raw = localStorage.getItem("auth");
      if (!raw) return { token: null, user: null };
      return normalizeAuth(JSON.parse(raw));
    } catch {
      return { token: null, user: null };
    }
  });

  const setUser = (incoming: AuthShape) => {
    const normalized = normalizeAuth(incoming);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("auth", JSON.stringify(normalized));
      }
    } catch {
      // ignore storage errors
    }

    // Immediately set axios default header to avoid a timing window where navigation occurs
    try {
      if (normalized?.token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${normalized.token}`;
      } else {
        delete axios.defaults.headers.common["Authorization"];
      }
    } catch {
      // ignore axios errors
    }

    setAuth(normalized);
  };

  const logout = () => {
    try {
      if (typeof window !== "undefined") {
        // remove both normal auth and adminAuth (ensure admin session is cleared)
        localStorage.removeItem("auth");
        localStorage.removeItem("adminAuth");
      }
    } catch {
      // ignore
    }
    setAuth({ token: null, user: null });
    try {
      delete axios.defaults.headers.common["Authorization"];
    } catch {}
  };

  // Keep axios default header and localStorage in sync (still useful for other updates)
  useEffect(() => {
    if (auth?.token) {
      try {
        axios.defaults.headers.common["Authorization"] = `Bearer ${auth.token}`;
      } catch {}
    } else {
      try {
        delete axios.defaults.headers.common["Authorization"];
      } catch {}
    }
  }, [auth]);

  // Sync if other tabs change auth or adminAuth
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth" || e.key === "adminAuth") {
        try {
          const raw = typeof window !== "undefined" ? localStorage.getItem("auth") : null;
          const val = raw ? normalizeAuth(JSON.parse(raw)) : { token: null, user: null };
          setAuth(val);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user: auth.user, token: auth.token, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;