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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, { email, password });
      // accept either { access_token, user } or { token, user } or { user, access_token }
      const token = res.data?.access_token || res.data?.token || res.data?.accessToken;
      const user = res.data?.user || res.data;

      if (!user || user.role !== 'admin') {
        setStatus({ type: 'error', message: 'Not authorized as admin' });
        setSubmitting(false);
        return;
      }

      // create a normalized auth object
      const auth = { token, ...user };
      setUser(auth);
      // store in localStorage handled by AuthContext effect
      router.push('/admin/dashboard');
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.response?.data?.message || 'Login failed' });
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