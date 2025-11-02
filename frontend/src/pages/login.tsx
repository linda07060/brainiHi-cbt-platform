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
 * Minimal, professional student login page.
 * - Uses MUI components but applies a small CSS module for layout.
 * - Includes "Forgot password" and "Register" links.
 * - Honors site theme colors via frontend/src/theme.ts
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
          const auth = { token, ...res.data };
          localStorage.setItem("auth", JSON.stringify(auth));
          setUser(auth);
          router.push("/dashboard");
        })
        .catch(() => {
          setMsg("Google login failed. Try again.");
          setOpen(true);
        })
        .finally(() => setLoading(false));
    }
  }, [router.query.token, setUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        { email, password }
      );

      const auth = { token: res.data.access_token, ...res.data.user };
      localStorage.setItem("auth", JSON.stringify(auth));
      setUser(auth);

      setSuccess(true);
      setMsg("Login successful — redirecting...");
      setOpen(true);

      setTimeout(() => router.push("/dashboard"), 900);
    } catch (error: any) {
      setSuccess(false);
      setMsg(
        error?.response?.data?.message ||
          "Login failed. Please check your credentials and try again."
      );
      setOpen(true);
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

            {/* Wrap GoogleButton in a styled container instead of passing className prop,
                because the GoogleButton component's props do not accept className. */}
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