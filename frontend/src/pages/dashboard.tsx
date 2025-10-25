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
  const { user, logout } = useAuth();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  // If user is not present, redirect to /login (optional: or show login link)
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null; // or a loading spinner

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