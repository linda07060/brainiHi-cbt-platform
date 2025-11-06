import React, { useState } from 'react';
import { Container, Box, TextField, Button, Typography, Snackbar, Alert } from '@mui/material';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Admin.module.css';

export default function AdminLogin() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      // NOTE: call the admin login endpoint (not the user /auth/login)
      const res = await axios.post(`${apiBase}/admin/auth/login`, { email, password });

      // Accept several possible token field names
      const token = res.data?.access_token || res.data?.token || res.data?.accessToken;
      // Admin endpoint returns { access_token, admin }
      const admin = res.data?.admin || res.data?.user || res.data;

      if (!token) {
        setStatus({ type: 'error', message: 'Authentication token not returned by server' });
        setSubmitting(false);
        return;
      }

      if (!admin || admin.role !== 'admin') {
        setStatus({ type: 'error', message: 'Not authorized as admin' });
        setSubmitting(false);
        return;
      }

      // Normalized auth object — keep shape consistent with your AuthContext expectations
      const auth = { token, ...admin };
      setUser(auth);

      // navigate to admin dashboard
      router.push('/admin/dashboard');
    } catch (err: any) {
      // Prefer server-provided message, fall back to generic text
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.statusText ||
        err?.message ||
        'Login failed';
      setStatus({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ pt: 8 }}>
      <Box className={styles.card}>
        <Typography variant="h5" sx={{ mb: 1 }}>Admin sign in</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Sign in with your admin account</Typography>

        <form onSubmit={handleSubmit}>
          <TextField label="Email" fullWidth required value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Password" type="password" fullWidth required value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Box>

      <Snackbar
        open={!!status}
        autoHideDuration={3000}
        onClose={() => setStatus(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {status ? (
          <Alert severity={status.type} onClose={() => setStatus(null)}>
            {status.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  );
}