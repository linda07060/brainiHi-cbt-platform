import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemText, Divider, CircularProgress } from '@mui/material';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

interface TestSummary {
  id: number;
  title: string;
  score: number;
  takenAt: string;
}

export default function Dashboard() {
  const { user, setUser, logout } = useAuth();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Handle Google OAuth token from query string
  useEffect(() => {
    const { token } = router.query;
    if (!user && typeof token === 'string' && token.length > 0) {
      // Option 1: If you have user info in token, just save it
      // Option 2: If you need to fetch user info, do it here:
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(res => {
        const auth = { token, ...res.data };
        localStorage.setItem('auth', JSON.stringify(auth));
        setUser(auth);
        // Clean the URL (remove ?token=...)
        router.replace('/dashboard');
      })
      .catch(() => {
        // If token invalid, redirect to login
        router.replace('/login');
      });
    }
  }, [router.query.token, setUser, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tests/my`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(res => setTests(res.data))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, [user]);

  // If user is not present, redirect to /login
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 6 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Welcome, {user.name}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" mb={2}>
        Plan: {user.plan} &nbsp;|&nbsp; Level: {user.level}
        <br />
        {user.plan_expiry && `Plan expires: ${new Date(user.plan_expiry).toLocaleDateString()}`}
      </Typography>
      <Button
        component={Link}
        href="/test"
        variant="contained"
        color="primary"
        sx={{ mb: 3 }}
      >
        Start New Test
      </Button>
      <Paper sx={{ mt: 2, p: 2 }}>
        <Typography variant="h6" mb={1}>Past Test Attempts</Typography>
        {loading ? <CircularProgress /> : (
          <List>
            {tests.length === 0 && <ListItem><ListItemText primary="No test attempts yet." /></ListItem>}
            {tests.map(t => (
              <React.Fragment key={t.id}>
                <ListItem
                  secondaryAction={
                    <Button component={Link} href={`/review?id=${t.id}`} size="small" variant="outlined">Review</Button>
                  }
                >
                  <ListItemText
                    primary={t.title}
                    secondary={`Score: ${t.score} | Taken: ${new Date(t.takenAt).toLocaleString()}`}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      <Button component={Link} href="/profile" variant="text" sx={{ mt: 2 }}>Change Password / Profile</Button>
      <Button onClick={logout} color="error" sx={{ mt: 2, ml: 2 }}>Logout</Button>
    </Box>
  );
}