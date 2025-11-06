import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert } from '@mui/material';
import axios from 'axios';
import styles from '../styles/ForgotPassword.module.css';
import Spinner from '../components/Spinner';
import { useRouter } from 'next/router';

/**
 * Maps question keys to friendly text. Keep the keys in sync with registration options.
 */
const QUESTION_MAP: Record<string, string> = {
  'mother_maiden': "What is your mother's maiden name?",
  'first_school': "What was the name of your first school?",
  'first_car': "What was the make of your first car?",
  'favorite_teacher': "Who was your favorite teacher?",
};

interface VerifyResponse {
  token?: string;
  message?: string;
  [k: string]: any;
}

export default function VerifyIdentityPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recoveryPassphrase, setRecoveryPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const ident = typeof window !== 'undefined' ? sessionStorage.getItem('reset_identifier') : '';
    const qs = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('reset_questions') || '[]') : [];
    if (!ident) {
      router.push('/forgot-identity');
      return;
    }
    setIdentifier(ident);
    setQuestions(Array.isArray(qs) ? qs.map(String) : []);
  }, [router]);

  const handleChange = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setStatus({ type: 'error', message: 'Missing identifier. Start again.' });
      return;
    }
    for (const k of questions) {
      if (!answers[k] || answers[k].trim().length === 0) {
        setStatus({ type: 'error', message: 'Please answer all questions.' });
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        identifier,
        answers: questions.map((q: string) => ({ questionKey: q, answer: answers[q] || '' })),
        recoveryPassphrase,
      };
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/security-reset/verify`, payload);

      const data = (res?.data ?? {}) as VerifyResponse;
      const token = data.token;
      if (token) {
        try { sessionStorage.setItem('reset_token', token); } catch {}
        router.push('/reset-password');
        return;
      }
      setStatus({ type: 'error', message: data.message ?? 'Verification failed' });
    } catch (err: any) {
      const serverData = (err?.response?.data ?? {}) as VerifyResponse;
      setStatus({ type: 'error', message: serverData.message ?? 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={styles.page}>
      <Paper className={styles.card} component="main" role="main">
        <Typography variant="h5" className={styles.title}>Confirm your identity</Typography>
        <Typography variant="body2" className={styles.subtitle}>Answer the security questions and enter your recovery passphrase.</Typography>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {questions.map((q) => (
            <div key={q}>
              <TextField
                id={`q-${q}`}
                label={QUESTION_MAP[q] || q}
                value={answers[q] || ''}
                onChange={(e) => handleChange(q, e.target.value)}
                required
                fullWidth
                size="small"
                variant="outlined"
                className={styles.field}
              />
            </div>
          ))}

          <TextField
            id="recoveryPassphrase"
            label="Recovery passphrase"
            type="password"
            value={recoveryPassphrase}
            onChange={(e) => setRecoveryPassphrase(e.target.value)}
            helperText="This is the passphrase you created during registration. It is case-sensitive."
            fullWidth
            size="small"
            variant="outlined"
            className={styles.field}
          />

          <Button type="submit" variant="contained" color="primary" fullWidth size="large" disabled={loading} aria-busy={loading} sx={{ fontWeight: 800 }}>
            {loading ? <><Spinner /> Verifying…</> : 'Verify & Continue'}
          </Button>
        </form>
      </Paper>

      <Snackbar open={!!status} autoHideDuration={4500} onClose={() => setStatus(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={status?.type || 'info'} onClose={() => setStatus(null)}>{status?.message}</Alert>
      </Snackbar>
    </Box>
  );
}