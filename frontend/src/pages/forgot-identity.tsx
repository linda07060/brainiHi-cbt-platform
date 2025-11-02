import React, { useRef, useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert } from '@mui/material';
import axios from 'axios';
import styles from '../styles/ForgotPassword.module.css';
import Spinner from '../components/Spinner';

/**
 * Enter identifier (email or user id) to find account.
 * If account found and has security questions the server returns the question keys
 * which we store in sessionStorage and navigate to /verify-identity.
 */
export default function ForgotIdentity() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setStatus({ type: 'error', message: 'Please enter your email or user id.' });
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/security-reset/initiate`, { identifier });
      if (res.data?.found && res.data?.hasQuestions) {
        sessionStorage.setItem('reset_identifier', identifier);
        sessionStorage.setItem('reset_questions', JSON.stringify(res.data.questions));
        window.location.href = '/verify-identity';
        return;
      }
      setStatus({ type: 'success', message: res.data?.message || 'If an account with that identifier exists, follow the next steps.' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'Unable to process request' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={styles.page}>
      <Paper className={styles.card} component="main" role="main">
        <Typography variant="h5" className={styles.title}>Find your account</Typography>
        <Typography variant="body2" className={styles.subtitle}>Enter your email address or user id to locate your account.</Typography>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <TextField
            inputRef={inputRef}
            id="identifier"
            name="identifier"
            label="Email or user id"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            fullWidth
            size="small"
            variant="outlined"
            className={styles.field}
            autoComplete="username"
            autoFocus
          />

          <Button type="submit" variant="contained" color="primary" fullWidth size="large" disabled={loading} aria-busy={loading} sx={{ fontWeight: 800 }}>
            {loading ? <><Spinner /> Checking…</> : 'Find account'}
          </Button>

          <Typography variant="body2" className={styles.footerText}>
            Remembered? <a href="/login" className={styles.register}>Sign in</a>
          </Typography>
        </form>
      </Paper>

      <Snackbar open={!!status} autoHideDuration={4500} onClose={() => setStatus(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={status?.type || 'info'} onClose={() => setStatus(null)}>{status?.message}</Alert>
      </Snackbar>
    </Box>
  );
}