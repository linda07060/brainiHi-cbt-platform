import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert } from '@mui/material';
import axios from 'axios';
import styles from '../styles/ForgotPassword.module.css';
import Spinner from '../components/Spinner';

export default function ResetPassword() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('reset_token') : null;
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/forgot-identity');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters' });
      return;
    }
    if (password !== password2) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/security-reset/confirm`, { token, password });
      setStatus({ type: 'success', message: res.data?.message || 'Password updated' });
      sessionStorage.removeItem('reset_token');
      sessionStorage.removeItem('reset_identifier');
      sessionStorage.removeItem('reset_questions');
      setTimeout(() => router.push('/login'), 1200);
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'Unable to update password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={styles.page}>
      <Paper className={styles.card} component="main" role="main">
        <Typography variant="h5" className={styles.title}>Create a new password</Typography>
        <Typography variant="body2" className={styles.subtitle}>Enter a strong password. Your account will be updated immediately on success.</Typography>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <TextField id="password" label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth size="small" variant="outlined" className={styles.field} />
          <TextField id="password2" label="Confirm password" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required fullWidth size="small" variant="outlined" className={styles.field} />

          <Button type="submit" variant="contained" color="primary" fullWidth size="large" disabled={loading} aria-busy={loading} sx={{ fontWeight: 800 }}>
            {loading ? <><Spinner /> Saving…</> : 'Save new password'}
          </Button>
        </form>
      </Paper>

      <Snackbar open={!!status} autoHideDuration={4500} onClose={() => setStatus(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={status?.type || 'info'} onClose={() => setStatus(null)}>{status?.message}</Alert>
      </Snackbar>
    </Box>
  );
}