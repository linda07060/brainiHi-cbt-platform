import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Box, Typography, Grid, Paper, Button } from '@mui/material';
import adminApi from '../../lib/adminApi';
import styles from '../../styles/Admin.module.css';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import UserDetailModal from '../../components/admin/UserDetailModal';
import RecentActivityCard from '../../components/admin/RecentActivityCard';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);

  // modal state: selected user object (from recentSignups)
  const [selectedUserData, setSelectedUserData] = useState<any | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const rawAdmin = typeof window !== 'undefined' ? localStorage.getItem('adminAuth') : null;
    const adminStored = rawAdmin ? JSON.parse(rawAdmin) : null;

    if ((!user || user.role !== 'admin') && !adminStored) {
      router.push('/admin/login');
      return;
    }

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  const fetchStats = () => {
    adminApi
      .get('/admin/stats')
      .then((res) => setStats(res.data))
      .catch(() => setStats(null));
  };

  // Open the existing UserDetailModal.
  // If the passed row is only an activity row (no phone/created) try to fetch the full user first.
  const openDetails = async (userObj?: any) => {
    if (!userObj) return;

    // Helper: detect if an object already looks like a full user
    const hasPhone = !!(userObj?.phone || userObj?.phoneNumber || userObj?.mobile);
    const hasCreated = !!(userObj?.createdAt || userObj?.created_at || userObj?.created);

    // Determine a candidate id (same logic as before)
    let modalId: number | string | null = null;
    if (typeof userObj === 'object') {
      if (userObj.id !== undefined && userObj.id !== null && String(userObj.id).trim() !== '') {
        const s = String(userObj.id).trim();
        modalId = /^[0-9]+$/.test(s) ? s : userObj.id;
      } else if (userObj.user_id !== undefined && userObj.user_id !== null && String(userObj.user_id).trim() !== '') {
        const s = String(userObj.user_id).trim();
        modalId = /^[0-9]+$/.test(s) ? s : userObj.user_id;
      } else if (typeof userObj.user_uid === 'string' && /^[0-9]+$/.test(userObj.user_uid.trim())) {
        modalId = userObj.user_uid.trim();
      } else {
        modalId = null;
      }
    }

    // If row already contains the needed fields, open immediately
    if (hasPhone && hasCreated) {
      setSelectedUserId(modalId);
      setSelectedUserData(userObj);
      setModalOpen(true);
      return;
    }

    // Otherwise attempt to fetch the full user by id/user_uid or by email
    let fetched: any = null;
    const idCandidate = userObj?.id ?? userObj?.user_id ?? userObj?.user_uid ?? null;
    const emailCandidate = userObj?.email ?? userObj?.user_email ?? null;

    try {
      if (idCandidate != null && String(idCandidate).trim() !== '') {
        // Try single-user endpoint (server may accept numeric id or user_uid)
        try {
          const res = await adminApi.get(`/admin/users/${encodeURIComponent(String(idCandidate))}`);
          fetched = res?.data ?? null;
        } catch {
          // ignore: fallback below to email query
        }
      }

      if (!fetched && emailCandidate) {
        try {
          const res = await adminApi.get('/admin/users', { params: { email: emailCandidate } });
          const body = res?.data;
          if (Array.isArray(body) && body.length > 0) fetched = body[0];
          else if (body && typeof body === 'object') fetched = body;
        } catch {
          // ignore
        }
      }
    } catch (err) {
      // ignore top-level errors, we'll fallback to using the provided row
      // eslint-disable-next-line no-console
      console.warn('openDetails: fetching full user failed', err);
    }

    // Use fetched full user if available, otherwise fallback to the activity/userObj
    const display = fetched ?? userObj;
    const displayId = fetched ? (fetched.id ?? fetched.user_id ?? modalId) : modalId;

    setSelectedUserId(displayId ?? null);
    setSelectedUserData(display);
    setModalOpen(true);
  };

  const closeDetails = () => {
    setModalOpen(false);
    setSelectedUserData(null);
    setSelectedUserId(null);
  };

  // Called when the modal reports an updated user object (e.g. after admin action).
  const handleUserUpdated = (updatedUser: any) => {
    // Update stats.recentSignups if present
    if (stats && Array.isArray(stats.recentSignups)) {
      const updated = stats.recentSignups.map((u: any) => {
        // match by id or email or user_uid
        const matchId = u?.id ?? u?.user_id ?? null;
        const updId = updatedUser?.id ?? updatedUser?.user_id ?? null;
        if (
          (matchId !== null && updId !== null && String(matchId) === String(updId)) ||
          (u?.email && updatedUser?.email && u.email === updatedUser.email) ||
          (u?.user_uid && updatedUser?.user_uid && u.user_uid === updatedUser.user_uid)
        ) {
          return { ...u, ...updatedUser };
        }
        return u;
      });
      setStats({ ...stats, recentSignups: updated });
    }
    // update selectedUserData too
    setSelectedUserData(updatedUser);
  };

  const renderStatValue = (value: any) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {value.map((item: any, i: number) => {
            if (item === null || item === undefined) return (
              <span key={i}>—</span>
            );
            if (typeof item === 'string' || typeof item === 'number') {
              return <span key={i}>{String(item)}</span>;
            }
            const label = item.email ?? item.name ?? item.user_uid ?? item.id ?? JSON.stringify(item);
            return <span key={i}>{label}</span>;
          })}
        </Box>
      );
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) return '—';
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {entries.map(([k, v]) => (
            <span key={k}>
              {k}: {String(v)}
            </span>
          ))}
        </Box>
      );
    }
    try {
      return String(value);
    } catch {
      return '—';
    }
  };

  const summary = [
    { label: 'Total users', value: stats?.totalUsers ?? '—' },
    { label: 'Active users', value: stats?.activeUsers ?? '—' },
    { label: 'Free / Pro / Tutor', value: stats?.plansSummary ?? '—' },
  ];

  const recentSignups = Array.isArray(stats?.recentSignups) ? stats.recentSignups : [];

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Admin tools and quick actions
        </Typography>

        <div className={styles.cards}>
          {summary.map((s) => (
            <Paper key={s.label} className={styles.card}>
              <Typography className={styles.kv}>{s.label}</Typography>
              <Typography className={styles.kvValue} component="div">
                {renderStatValue(s.value)}
              </Typography>
            </Paper>
          ))}

          <Paper key="Recent signups" className={styles.card}>
            <Typography className={styles.kv}>Recent signups</Typography>
            <Box className={styles.recentList}>
              {recentSignups.length > 0 ? (
                recentSignups.map((r: any, idx: number) => {
                  const email = typeof r === 'string' ? r : (r.email ?? r.user_email ?? r.email_address ?? '');
                  return (
                    <Box
                      key={idx}
                      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 0.5 }}
                    >
                      <Typography className={styles.recentItem} sx={{ flex: 1 }}>
                        {email || '—'}
                      </Typography>
                      <Button size="small" variant="outlined" onClick={() => openDetails(r)}>
                        View
                      </Button>
                    </Box>
                  );
                })
              ) : (
                <Typography className={styles.recentItem}>No recent signups</Typography>
              )}
            </Box>
          </Paper>
        </div>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper className={styles.card} sx={{ p: 2 }}>
              <Typography variant="h6">Quick actions</Typography>
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button variant="contained" onClick={() => router.push('/admin/users')}>
                  Manage users
                </Button>
                <Button variant="outlined" onClick={() => router.push('/admin/users')}>
                  Search users
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <RecentActivityCard initialStats={stats} />
          </Grid>
        </Grid>
      </Box>

      <UserDetailModal
        open={modalOpen}
        onClose={closeDetails}
        userId={selectedUserId}
        userData={selectedUserData}
        onUpdated={handleUserUpdated}
      />
    </AdminLayout>
  );
}