import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Login.module.css';

export default function ChangePassword(): JSX.Element {
  const router = useRouter();
  const { token: ctxToken } = useAuth() as any;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [meLoading, setMeLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [msg, setMsg] = useState('');
  const [meUser, setMeUser] = useState<any | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

  // Minimal response shape for the change-password endpoint
  interface ChangePasswordResponse {
    message?: string;
    [k: string]: any;
  }

  // Helper to derive token: prefer context, fall back to localStorage
  const getToken = () => {
    if (ctxToken) return ctxToken;
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.token || parsed?.access_token || null;
    } catch {
      return null;
    }
  };

  // Small utility to mask an email for display
  const maskEmail = (email?: string | null) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local.slice(0, 2)}...${local.slice(-1)}@${domain}`;
  };

  // Validate form
  const validate = (): string | null => {
    if (!currentPassword) return 'Enter your current password';
    if (!newPassword) return 'Enter a new password';
    if (newPassword.length < 8) return 'New password must be at least 8 characters';
    if (newPassword !== confirm) return 'New password and confirm do not match';
    return null;
  };

  // Preflight: fetch /auth/me to confirm token/session and user identity
  const fetchMe = async (token: string | null) => {
    if (!token) {
      setMeUser(null);
      setMeLoading(false);
      return { ok: false, status: 401 };
    }
    try {
      const res = await axios.get(`${apiBase}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMeUser(res.data || null);
      setMeLoading(false);
      return { ok: true, status: res.status, data: res.data };
    } catch (err: any) {
      setMeUser(null);
      setMeLoading(false);
      const status = err?.response?.status || 500;
      return { ok: false, status };
    }
  };

  // On mount, call /auth/me once to show who is signed in
  useEffect(() => {
    (async () => {
      setMeLoading(true);
      const token = getToken();
      await fetchMe(token);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setMsg(err);
      setSuccess(false);
      setOpen(true);
      return;
    }

    // Re-read token and confirm session before attempting password change
    const token = getToken();
    if (!token) {
      setMsg('Session missing. Please sign in again.');
      setSuccess(false);
      setOpen(true);
      setTimeout(() => router.push('/login'), 900);
      return;
    }

    setLoading(true);
    // Preflight check to ensure token is still valid and belongs to the expected user
    const pre = await fetchMe(token);
    if (!pre.ok) {
      setLoading(false);
      setMsg('Session expired or invalid. Please sign in again.');
      setSuccess(false);
      setOpen(true);
      setTimeout(() => router.push('/login'), 1200);
      return;
    }

    // Build the payload — send canonical fields server might expect.
    // (We keep an inclusive set; server should pick the ones it expects.)
    const payload = {
      currentPassword,
      newPassword,
      oldPassword: currentPassword,
      password: newPassword,
      current_password: currentPassword,
      new_password: newPassword,
      old_password: currentPassword,
    };

    try {
      const headers: any = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      const res = await axios.post(`${apiBase}/auth/change-password`, payload, { headers });

      // Cast response to a permissive shape so TypeScript knows 'message' may exist
      const data = (res?.data ?? {}) as ChangePasswordResponse;

      setSuccess(true);
      setMsg(data.message ?? 'Password changed successfully');
      setOpen(true);
      // Optionally clear local auth so user re-signs with new password:
      try { localStorage.removeItem('auth'); } catch {}
      setTimeout(() => router.push('/login'), 900);
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMessage = (err?.response?.data as ChangePasswordResponse)?.message || (err?.response?.data as any)?.error || err?.message;

      if (status === 401) {
        setMsg('Current password is incorrect. If you forgot it, use "Forgot password" to reset.');
        setSuccess(false);
        setOpen(true);
      } else {
        setMsg(serverMessage || 'Unable to change password. Please try again later.');
        setSuccess(false);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={styles.page} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <Paper elevation={2} className={styles.card} sx={{ maxWidth: 720, width: '100%', padding: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Change Password
        </Typography>

        {meLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {meUser ? (
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Signed in as <strong>{maskEmail(meUser?.email)}</strong>. If this is not your account, sign out and sign in with the correct account.
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ mb: 2, color: 'error.main' }}>
                Session not found — you will need to sign in first.
              </Typography>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <TextField
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                required
                margin="normal"
                autoComplete="current-password"
              />

              <TextField
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                required
                margin="normal"
                helperText="At least 8 characters"
                autoComplete="new-password"
              />

              <TextField
                label="Confirm new password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                fullWidth
                required
                margin="normal"
                autoComplete="new-password"
              />

              <Box sx={{ display: 'flex', gap: 2, mt: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={loading || !meUser}
                  sx={{ minWidth: 200, height: 56, borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                >
                  {loading ? 'Saving…' : 'Change password'}
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => router.push('/dashboard')}
                  sx={{ minWidth: 200, height: 56, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Cancel
                </Button>

                <Button
                  color="secondary"
                  variant="text"
                  onClick={() => router.push('/forgot-identity')}
                  sx={{ ml: 2, fontWeight: 800, color: '#ffb300', textTransform: 'none' }}
                >
                  Forgot password
                </Button>
              </Box>
            </form>
          </>
        )}

        <Snackbar open={open} autoHideDuration={4500} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={success ? 'success' : 'error'} sx={{ width: '100%' }} onClose={() => setOpen(false)}>
            {msg}
          </Alert>
        </Snackbar>
      </Paper>
    </Box>
  );
}