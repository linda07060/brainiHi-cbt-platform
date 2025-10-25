import { Box, Button, Container, TextField, Typography, Snackbar, Alert } from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg('');
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        name,
        email,
        password
      });
      setSuccess(true);
      setOpen(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (error: any) {
      setMsg(
        error.response?.data?.message ||
        'Registration failed. Please try again.'
      );
      setSuccess(false);
      setOpen(true);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" fontWeight="bold" mb={2}>Register for CBT Portal</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Name"
            name="name"
            type="text"
            fullWidth
            margin="normal"
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />
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
            Register
          </Button>
        </form>
        <Link href="/login" style={{ display: 'block', marginTop: 24 }}>
          Already have an account? Login
        </Link>
        {/* Snackbar for success/error */}
        <Snackbar
          open={open}
          autoHideDuration={2500}
          onClose={() => setOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          {success ? (
            <Alert severity="success" sx={{ width: '100%' }}>
              You have successfully registered to the CBT platform. Kindly login with your details.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ width: '100%' }}>
              {msg}
            </Alert>
          )}
        </Snackbar>
      </Box>
    </Container>
  );
}