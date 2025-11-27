import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Snackbar,
  Alert,
} from "@mui/material";
import GoogleButton from "../components/GoogleButton";
import Preloader from "../components/Preloader";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import adminApi from "../lib/adminApi";
import styles from "../styles/Login.module.css";

import AITransparency from "../components/AITransparency";
import LegalDisclaimer from "../components/LegalDisclaimer";
import Header from "../components/Header";

interface LoginResponse {
  access_token?: string;
  token?: string;
  accessToken?: string;
  user?: any;
  require_security_setup?: boolean;
  require_passphrase_setup?: boolean;
  [k: string]: any;
}

export default function Login(): JSX.Element {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Prevent duplicate navigation from multiple listeners within this component instance
  const navLockRef = useRef(false);

  // tolerant true-ish evaluator
  const valueIsTrueish = (v: any) => {
    if (v === true) return true;
    if (v === 1) return true;
    if (v === "1") return true;
    if (typeof v === "string" && ["true", "TRUE", "True"].includes(v)) return true;
    return false;
  };

  const fetchMe = async (token: string) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001"}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.debug("/auth/me response:", res?.data);
      return res.data;
    } catch (err: unknown) {
      const e = err as any;
      console.warn("fetchMe failed", e?.response?.data ?? e?.message ?? e);
      return null;
    }
  };

  // Always use fresh /auth/me result to decide where to navigate after login.
  const navigateAfterLogin = (userPayload: any) => {
    if (navLockRef.current) {
      console.debug("navigateAfterLogin: navigation already handled by this instance, ignoring duplicate call");
      return;
    }

    // Normalize many possible shapes & key names
    const read = (obj: any, names: string[]) => {
      if (!obj) return undefined;
      for (const k of names) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
      }
      const u = obj.user ?? obj;
      if (u && typeof u === "object") {
        for (const k of names) if (Object.prototype.hasOwnProperty.call(u, k)) return u[k];
      }
      return undefined;
    };

    const secRaw = read(userPayload, [
      "require_security_setup",
      "requireSecuritySetup",
      "require_security",
      "requireSecurity",
      // note: we intentionally do NOT treat securityConfigured === false as a hard "require" here
      // because that flag can be unset/false for reasons other than an admin reset.
    ]);
    const passRaw = read(userPayload, [
      "require_passphrase_setup",
      "requirePassphraseSetup",
      "require_passphrase",
      "requirePassphrase",
    ]);
    // const securityConfigured = read(userPayload, ["securityConfigured", "security_configured"]);

    // IMPORTANT: require security only when an explicit require flag is present.
    // Removing the previous "securityConfigured === false" clause prevents forcing users into security
    // setup when the admin didn't explicitly reset security.
    const requireSecurity = valueIsTrueish(secRaw);
    const requirePassphrase = valueIsTrueish(passRaw);

    console.debug("navigateAfterLogin -> requireSecurity:", requireSecurity, "requirePassphrase:", requirePassphrase, "userPayload:", userPayload);

    // Ensure preloader hides before navigation
    try {
      setLoading(false);
    } catch {}

    // Acquire in-component lock immediately to avoid duplicate navigation
    navLockRef.current = true;

    // Use replace instead of push so back button doesn't return to login and reduces visible flicker
    if (requireSecurity && requirePassphrase) {
      router.replace('/setup-required');
      return;
    }
    if (requireSecurity) {
      router.replace('/setup-security');
      return;
    }
    if (requirePassphrase) {
      router.replace('/setup-passphrase');
      return;
    }
    router.replace('/dashboard');
  };

  useEffect(() => {
    const { token } = router.query;
    if (typeof token === "string" && token.length > 0) {
      setLoading(true);
      (async () => {
        try {
          // ALWAYS fetch fresh /auth/me using the token from the query
          const me = await fetchMe(token);

          // NAV LOCK: mark localStorage so global listeners defer while login flow finishes
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem('auth_nav_lock', JSON.stringify({ ts: Date.now() }));
            }
          } catch {}

          const auth = { token, user: me ?? null };

          // persist auth for other tabs
          try {
            if (typeof window !== "undefined") localStorage.setItem("auth", JSON.stringify(auth));
          } catch {}

          // apply token to global axios and adminApi so subsequent requests include it
          try {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          } catch {}
          try {
            if ((adminApi as any).defaults && (adminApi as any).defaults.headers) {
              (adminApi.defaults as any).headers = (adminApi.defaults as any).headers || {};
              (adminApi.defaults as any).headers.common = (adminApi.defaults as any).headers.common || {};
              (adminApi.defaults as any).headers.common['Authorization'] = `Bearer ${token}`;
            } else {
              try { (adminApi.defaults.headers as any).common['Authorization'] = `Bearer ${token}`; } catch {}
            }
          } catch {}

          setUser(auth as any);

          // remove the nav lock immediately after we set context so other listeners don't race
          try { localStorage.removeItem('auth_nav_lock'); } catch {}

          // navigate based on the DB-backed /auth/me response
          navigateAfterLogin(me ?? {});

          // remove the nav lock shortly after as an extra safety (no-op if already removed)
          setTimeout(() => {
            try { localStorage.removeItem('auth_nav_lock'); } catch {}
          }, 2500);
        } catch (err: unknown) {
          const e = err as any;
          setMsg("Google login failed. Try again.");
          setOpen(true);
          console.error("Google login error", e?.response ?? e);
        } finally {
          setLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query, setUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001"}/auth/login`,
        { email, password }
      );

      console.debug("/auth/login response:", res?.data);
      const data = (res?.data ?? {}) as LoginResponse;

      const token = data.access_token ?? data.token ?? data.accessToken ?? null;
      const returnedUser = data.user ?? null;

      if (!token) {
        // no token; maybe login returned a user-only response — just navigate based on returnedUser
        if (returnedUser) {
          try {
            if (typeof window !== "undefined") localStorage.setItem("auth", JSON.stringify({ token: null, user: returnedUser }));
          } catch {}
          setUser({ token: null, user: returnedUser } as any);

          // ensure any nav lock is removed immediately
          try { localStorage.removeItem('auth_nav_lock'); } catch {}

          navigateAfterLogin(returnedUser);
        } else {
          throw new Error("Invalid login response (missing token)");
        }
        return;
      }

      // set token for subsequent requests
      try {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } catch {}
      try {
        if ((adminApi as any).defaults && (adminApi as any).defaults.headers) {
          (adminApi.defaults as any).headers = (adminApi.defaults as any).headers || {};
          (adminApi.defaults as any).headers.common = (adminApi.defaults as any).headers.common || {};
          (adminApi.defaults as any).headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          try { (adminApi.defaults.headers as any).common['Authorization'] = `Bearer ${token}`; } catch {}
        }
      } catch {}

      // IMPORTANT: ALWAYS fetch fresh /auth/me using the token for final user object and flags
      const me = await fetchMe(token);

      // prefer me (DB-backed); fallback to returnedUser or minimal user object
      let user = me ?? returnedUser ?? { email };

      // NAV LOCK: tell other listeners to defer redirects while we finish the login flow
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem('auth_nav_lock', JSON.stringify({ ts: Date.now() }));
        }
      } catch {}

      const auth = { token, user };
      try {
        if (typeof window !== "undefined") localStorage.setItem("auth", JSON.stringify(auth));
      } catch {}
      setUser(auth as any);

      // remove the nav lock immediately after we set context so other listeners don't race
      try { localStorage.removeItem('auth_nav_lock'); } catch {}

      setSuccess(true);
      setMsg("Login successful — redirecting...");
      setOpen(true);

      // Remove the nav lock after a short delay so global listeners resume (no-op if already removed)
      setTimeout(() => {
        try { localStorage.removeItem('auth_nav_lock'); } catch {}
      }, 2500);

      // Give UI a short moment to show success, then navigate.
      setTimeout(() => navigateAfterLogin(user), 400);
    } catch (error: any) {
      setSuccess(false);
      const serverData = (error?.response?.data ?? {}) as { message?: string; [k: string]: any };
      const message =
        serverData.message ||
        error?.message ||
        "Login failed. Please check your credentials and try again.";
      setMsg(message);
      setOpen(true);
      console.error("Login error", error?.response ?? error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Preloader open={loading} />
      <Box className={styles.page}>
        <Paper elevation={1} className={styles.card} component="main" role="main" aria-labelledby="login-title">
          <Typography id="login-title" variant="h4" component="h1" className={styles.title}>
            Welcome back
          </Typography>

          <Typography variant="body2" className={styles.subtitle}>
            Sign in to access your practice tests, progress and personalised study plans.
          </Typography>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <TextField
              id="email"
              name="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              size="small"
              variant="outlined"
              className={styles.field}
              autoComplete="email"
            />

            <TextField
              id="password"
              name="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              size="small"
              variant="outlined"
              className={styles.field}
              autoComplete="current-password"
            />

            <Box className={styles.row}>
              <Link href="/forgot-password" className={styles.forgot}>
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              sx={{ fontWeight: 800 }}
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            <Divider className={styles.divider} sx={{ marginY: 2 }}>
              or
            </Divider>

            <div className={styles.googleBtn}>
              <GoogleButton />
            </div>

            <Typography variant="body2" className={styles.footerText}>
              Don&apos;t have an account?{" "}
              <Link href="/register" className={styles.register}>
                Create one
              </Link>
            </Typography>
          </form>
        </Paper>
      </Box>

      <AITransparency />
      <LegalDisclaimer />

      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={success ? "success" : "error"} sx={{ width: "100%" }}>
          {msg}
        </Alert>
      </Snackbar>
    </>
  );
}