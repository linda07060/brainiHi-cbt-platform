import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import axios from 'axios';
import Spinner from '../components/Spinner';
import styles from '../styles/ForgotPassword.module.css';

/**
 * Updated Forgot Password page
 *
 * Behaviour:
 * - This page acts as the "Find your account" / "identify" step.
 * - User enters email OR user id. We call the backend security-reset initiate endpoint.
 * - If account is found and has security questions, we store identifier + question keys in sessionStorage
 *   and navigate to /verify-identity where the user answers questions + provides the recovery passphrase.
 * - If account not found (or no questions configured) we show a generic message to avoid enumeration.
 *
 * The TypeScript errors were caused by accessing properties on res.data which TypeScript infers as {}.
 * We fix that by introducing small response interfaces and casting res.data to them before use.
 */

/* Response shapes used on this page */
interface AuthConfigResponse {
  mailEnabled?: boolean;
  [k: string]: any;
}

interface SecurityResetInitiateResponse {
  found?: boolean;
  hasQuestions?: boolean;
  questions?: any[];
  message?: string;
  [k: string]: any;
}

export default function ForgotPassword(): JSX.Element {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [mailEnabled, setMailEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    // read backend config to adapt copy (safe global flag)
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/config`)
      .then((res) => {
        const data = (res?.data ?? {}) as AuthConfigResponse;
        setMailEnabled(Boolean(data.mailEnabled));
      })
      .catch(() => setMailEnabled(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!identifier || identifier.trim().length === 0) {
      setStatus({ type: 'error', message: 'Please enter your email or user id.' });
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/security-reset/initiate`, { identifier: identifier.trim() });
      const data = (res?.data ?? {}) as SecurityResetInitiateResponse;

      // If backend found the account and returned questions -> proceed to verify page
      if (data.found && data.hasQuestions && Array.isArray(data.questions) && data.questions.length > 0) {
        try {
          sessionStorage.setItem('reset_identifier', identifier.trim());
          sessionStorage.setItem('reset_questions', JSON.stringify(data.questions));
        } catch {
          // ignore storage errors
        }
        router.push('/verify-identity');
        return;
      }

      // Otherwise show a generic message (avoid account enumeration)
      setStatus({ type: 'success', message: data.message ?? 'If an account with that identifier exists, follow the next steps.' });
    } catch (err: any) {
      const serverData = (err?.response?.data ?? {}) as SecurityResetInitiateResponse;
      const msg = serverData.message ?? 'Unable to process request. Please try again later.';
      setStatus({ type: 'error', message: String(msg) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={styles.page}>
      <Paper elevation={1} className={styles.card} component="main" role="main" aria-labelledby="forgot-title">
        <Typography id="forgot-title" variant="h5" className={styles.title}>
          Find your account
        </Typography>

        <Typography variant="body2" className={styles.subtitle}>
          {mailEnabled === null
            ? 'Enter the email or user id associated with your account.'
            : 'Enter the email or user id associated with your account. We will guide you through identity confirmation to reset your password.'}
        </Typography>

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

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading}
            aria-busy={loading}
            sx={{ fontWeight: 800 }}
          >
            {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}><Spinner />Checking…</span> : 'Find account'}
          </Button>

          <Typography variant="body2" className={styles.footerText}>
            Remembered?{' '}
            <Link href="/login" className={styles.register}>
              Sign in
            </Link>
          </Typography>

          {/* If you want, show a support hint (kept neutral) */}
          {mailEnabled === false && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
              If you need help, contact support: <a href="/support">Support</a>
            </Typography>
          )}
        </form>
      </Paper>

      <Snackbar open={!!status} autoHideDuration={5000} onClose={() => setStatus(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setStatus(null)} severity={status?.type || 'info'} sx={{ width: '100%' }}>
          {status?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}