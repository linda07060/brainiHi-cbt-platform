import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert } from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import Preloader from '../components/Preloader';
import styles from '../styles/ForgotPassword.module.css';
import { useAuth } from '../context/AuthContext';

const SESSION_ACTIVE_STEP_KEY = 'app.setup.activeStep';
const SESSION_TOTAL_REQUIRED_KEY = 'app.setup.totalRequired';

export default function SetupPassphrasePage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [passphrase, setPassphrase] = useState('');
  const [passphrase2, setPassphrase2] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // admin notice state (tiny notification at top)
  const [adminNoticeOpen, setAdminNoticeOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
      if (!raw) {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase || passphrase.length < 4) {
      setStatus({ type: 'error', message: 'Passphrase must be at least 4 characters' });
      return;
    }
    if (passphrase !== passphrase2) {
      setStatus({ type: 'error', message: 'Passphrases do not match' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/auth/setup-passphrase`;
      const res = await axios.post<any>(url, { passphrase });
      const data: any = res?.data ?? {};

      setStatus({ type: 'success', message: data.message ?? 'Passphrase saved' });

      // Refresh authoritative user from server and update client auth
      let authoritativeUser: any = data.user ?? data;
      try {
        const meRes = await axios.get<any>(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/auth/me`);
        authoritativeUser = meRes?.data ?? authoritativeUser;
      } catch (meErr) {
        // eslint-disable-next-line no-console
        console.warn('Failed to refresh /auth/me after setup-passphrase', meErr);
      }

      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
        const current = raw ? JSON.parse(raw) : null;
        const token = current?.token ?? current?.access_token ?? current?.accessToken ?? null;
        const newAuth = token ? { token, user: authoritativeUser } : { token: null, user: authoritativeUser };
        try { if (typeof window !== 'undefined') localStorage.setItem('auth', JSON.stringify(newAuth)); } catch {}
        try { setUser(newAuth); } catch {}
      } catch {}

      // Keep the sessionStorage counters in sync for the setup flow
      try {
        const needPass = !!(authoritativeUser?.require_passphrase_setup ?? authoritativeUser?.requirePassphraseSetup ?? false);
        const needSecurity = !!(authoritativeUser?.require_security_setup ?? authoritativeUser?.requireSecuritySetup ?? false);
        const totalRequired = (needPass ? 1 : 0) + (needSecurity ? 1 : 0);
        try { sessionStorage.setItem(SESSION_TOTAL_REQUIRED_KEY, String(totalRequired)); } catch {}
        // If moving to the second step, set active step index to 1 (0-based)
        if (needSecurity && !needPass) {
          // unlikely (pass should be cleared now), but fallback to dashboard below
        }
        if (needSecurity && !needPass) {
          // no-op
        }
      } catch {}

      // Decide where to go next based on authoritative server flags.
      const needSecurity = !!(authoritativeUser?.require_security_setup ?? authoritativeUser?.requireSecuritySetup ?? false);
      const needPass = !!(authoritativeUser?.require_passphrase_setup ?? authoritativeUser?.requirePassphraseSetup ?? false);

      // If security is still required, move to that step. If not, go to dashboard.
      if (needSecurity) {
        try { sessionStorage.setItem(SESSION_ACTIVE_STEP_KEY, String(1)); } catch {} // indicate second step active
        router.replace('/setup-security');
        return;
      }

      // No further required steps
      try {
        sessionStorage.removeItem(SESSION_ACTIVE_STEP_KEY);
        sessionStorage.removeItem(SESSION_TOTAL_REQUIRED_KEY);
      } catch {}
      router.replace('/dashboard');
    } catch (err: any) {
      const serverMsg = (err?.response?.data?.message) ?? err?.message ?? 'Failed to save passphrase';
      setStatus({ type: 'error', message: String(serverMsg) });
    } finally {
      setLoading(false);
    }
  };

  // Logout handler: clear client state and navigate to login.
  // We intentionally do NOT change server-side require_* flags so the user will still be forced into setup on next login.
  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/auth/logout`);
    } catch (err) {
      // ignore
    }
    try {
      localStorage.removeItem('auth');
      sessionStorage.removeItem('app.setup.activeStep');
      sessionStorage.removeItem('app.setup.totalRequired');
    } catch (e) {
      // ignore
    }
    try {
      setUser?.(null);
    } catch {}
    router.replace('/login');
  };

  return (
    <>
      <Header />
      <Preloader />

      {adminNoticeOpen && (
        <Box sx={{ maxWidth: 720, margin: '12px auto 0', px: 2 }}>
          <Alert
            severity="info"
            onClose={() => setAdminNoticeOpen(false)}
            sx={{ fontSize: '0.95rem', py: 1 }}
          >
            An administrator reset your recovery passphrase (per your request). Please set a new passphrase to continue.
          </Alert>
        </Box>
      )}

      <Box className={styles.page}>
        <Paper className={styles.card} component="main" role="main">
          <Typography variant="h5" className={styles.title}>Set recovery passphrase</Typography>
          <Typography variant="body2" className={styles.subtitle}>
            Your passphrase is used for account recovery. Choose a strong secret you can remember.
          </Typography>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <TextField
              id="passphrase"
              label="Recovery passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
              fullWidth
              size="small"
              variant="outlined"
              className={styles.field}
              autoComplete="new-password"
            />

            <TextField
              id="passphrase2"
              label="Confirm recovery passphrase"
              type="password"
              value={passphrase2}
              onChange={(e) => setPassphrase2(e.target.value)}
              required
              fullWidth
              size="small"
              variant="outlined"
              className={styles.field}
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              sx={{ fontWeight: 800 }}
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Save passphrase'}
            </Button>

            <Box sx={{ mt: 2 }}>
              <Button onClick={handleLogout} variant="outlined" color="inherit" fullWidth>
                Logout
              </Button>
            </Box>
          </form>
        </Paper>
      </Box>

      <Snackbar open={!!status} autoHideDuration={4000} onClose={() => setStatus(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={(status?.type ?? 'info') as any} onClose={() => setStatus(null)}>{status?.message}</Alert>
      </Snackbar>
    </>
  );
}