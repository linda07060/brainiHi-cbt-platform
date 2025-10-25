import Preloader from "../components/Preloader";
import { Box, Button, Container, TextField, Typography, Divider, Snackbar, Alert } from '@mui/material';
import GoogleButton from '../components/GoogleButton';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  // Handle Google OAuth token in query
  useEffect(() => {
    const { token } = router.query;
    if (typeof token === 'string' && token.length > 0) {
      // Fetch user profile using the token
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        const auth = { token, ...res.data };
        localStorage.setItem('auth', JSON.stringify(auth));
        setUser(auth);
        router.push('/dashboard');
      })
      .catch(() => {
        setMsg('Google login failed. Try again.');
        setOpen(true);
      });
    }
  }, [router.query.token, setUser, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg('');
    setSuccess(false);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        { email, password }
      );
      // Combine token and user info
      const auth = { token: res.data.access_token, ...res.data.user };
      // Save to localStorage for persistence
      localStorage.setItem('auth', JSON.stringify(auth));
      // Update context for immediate access
      setUser(auth);
      setSuccess(true);
      setMsg('Login successful! Redirecting...');
      setOpen(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error: any) {
      setSuccess(false);
      setMsg(
        error.response?.data?.message ||
        'Login failed. Please check your credentials and try again.'
      );
      setOpen(true);
    }
  };

  return (
    <>
      <Preloader />
      <Container maxWidth="xs" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" fontWeight="bold" mb={2}>
            Welcome to CBT Portal
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              name="email"
              type="email"
              fullWidth
              margin="normal"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              name="password"
              type="password"
              fullWidth
              margin="normal"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2, py: 1.5, fontWeight: 'bold', fontSize: 18 }}
            >
              Login
            </Button>
          </form>
          <Divider sx={{ my: 3 }}>or</Divider>
          <GoogleButton />
          <Link href="/register" style={{ display: 'block', marginTop: 24 }}>
            Don&apos;t have an account? Register
          </Link>
          {/* Snackbar for success or error */}
          <Snackbar
            open={open}
            autoHideDuration={2000}
            onClose={() => setOpen(false)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            {success ? (
              <Alert severity="success" sx={{ width: '100%' }}>
                {msg}
              </Alert>
            ) : (
              <Alert severity="error" sx={{ width: '100%' }}>
                {msg}
              </Alert>
            )}
          </Snackbar>
        </Box>
      </Container>
    </>
  );
}