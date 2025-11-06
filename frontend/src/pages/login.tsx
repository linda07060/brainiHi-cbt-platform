import React, { useEffect, useState } from "react";
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
import styles from "../styles/Login.module.css";

/**
 * Login page with robust handler:
 * - normalizes token and user from common backend shapes
 * - immediately persists auth to localStorage
 * - sets axios.defaults.headers.common.Authorization before redirect
 * - updates AuthContext via setUser
 */

export default function Login(): JSX.Element {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle Google OAuth token in query (if your flow redirects with token)
  useEffect(() => {
    const { token } = router.query;
    if (typeof token === "string" && token.length > 0) {
      setLoading(true);
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          // Backend returned user object
          const auth = { token, user: res.data };
          try {
            if (typeof window !== "undefined") localStorage.setItem("auth", JSON.stringify(auth));
          } catch {}
          try {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          } catch {}
          setUser(auth as any);
          router.push("/dashboard");
        })
        .catch((err) => {
          const status = err?.response?.status;
          if (status === 404) {
            const emailFromResp = err?.response?.data?.email || "";
            const pre = emailFromResp || "";
            router.replace(`/register?email=${encodeURIComponent(pre)}`);
          } else {
            setMsg("Google login failed. Try again.");
            setOpen(true);
            // eslint-disable-next-line no-console
            console.error("Google login error", err?.response || err);
          }
        })
        .finally(() => setLoading(false));
    }
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

      // Normalize response to { token, user }
      const token =
        res.data?.access_token || res.data?.token || res.data?.accessToken || null;
      const user = res.data?.user || (res.data && (res.data.email || res.data.id) ? res.data : null);

      if (!token || !user) {
        throw new Error("Invalid login response (missing token or user)");
      }

      const auth = { token, user };

      // Persist immediately and set axios header so other hooks can use it
      try {
        if (typeof window !== "undefined") localStorage.setItem("auth", JSON.stringify(auth));
      } catch {}
      try {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } catch {}

      setUser(auth as any);

      setSuccess(true);
      setMsg("Login successful — redirecting...");
      setOpen(true);

      setTimeout(() => router.push("/dashboard"), 800);
    } catch (error: any) {
      setSuccess(false);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Login failed. Please check your credentials and try again.";
      setMsg(message);
      setOpen(true);
      // eslint-disable-next-line no-console
      console.error("Login error", error?.response || error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Preloader />
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