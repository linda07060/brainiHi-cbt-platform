import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Box, Typography, Grid, Paper, Button } from '@mui/material';
import api from '../../lib/adminApi';
import styles from '../../styles/Admin.module.css';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/admin/login');
      return;
    }

    // fetch admin stats
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .catch(() => setStats(null));
  }, [user, router]);

  const summary = [
    { label: 'Total users', value: stats?.totalUsers ?? '—' },
    { label: 'Active users', value: stats?.activeUsers ?? '—' },
    { label: 'Free / Pro / Tutor', value: stats?.plansSummary ?? '—' },
    { label: 'Recent signups', value: stats?.recentSignups ?? '—' },
  ];

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Admin tools and quick actions</Typography>

        <div className={styles.cards}>
          {summary.map((s) => (
            <Paper key={s.label} className={styles.card}>
              <Typography variant="caption" className={styles.kv}>{s.label}</Typography>
              <Typography variant="h5" className={styles.kvValue}>{s.value}</Typography>
            </Paper>
          ))}
        </div>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper className={styles.card}>
              <Typography variant="h6">Quick actions</Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={() => router.push('/admin/users')}>Manage users</Button>
                <Button variant="outlined" onClick={() => router.push('/admin/users')}>Search users</Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper className={styles.card}>
              <Typography variant="h6">Recent activity</Typography>
              <Box sx={{ mt: 2 }}>
                {stats?.recentActivity?.length ? (
                  stats.recentActivity.slice(0, 6).map((r: any, i: number) => (
                    <Typography key={i} variant="body2">{r}</Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No recent activity</Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
}