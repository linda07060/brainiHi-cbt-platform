import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

export default function AdminDashboard() {
  const { admin } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    setLoading(true);
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    })
      .then(res => setStats(res.data))
      .finally(() => setLoading(false));
  }, [admin]);

  if (!admin) return <Typography>Please <Link href="/admin/login">login</Link> as admin.</Typography>;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 6 }}>
      <Typography variant="h4" fontWeight="bold" mb={2}>
        Welcome, Admin
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Users</Typography>
            <Typography variant="h4">{stats?.users ?? <CircularProgress size={32} />}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Tests Taken</Typography>
            <Typography variant="h4">{stats?.tests ?? <CircularProgress size={32} />}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">Active Plans</Typography>
            <Typography variant="h4">{stats?.activePlans ?? <CircularProgress size={32} />}</Typography>
          </Paper>
        </Grid>
      </Grid>
      <Box mt={5}>
        <Typography variant="h6" mb={1}>Quick Actions</Typography>
        <ul>
          <li><Link href="/admin/users">Manage Users</Link></li>
          <li><Link href="/admin/tests">Manage Tests & Topics</Link></li>
          <li><Link href="/admin/plans">Manage Plans</Link></li>
          <li><Link href="/admin/ai">Configure AI</Link></li>
        </ul>
      </Box>
    </Box>
  );
}