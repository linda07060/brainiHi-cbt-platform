import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemText, Divider, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid } from '@mui/material';
import Link from 'next/link';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import styles from '../styles/Dashboard.module.css';

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

  // Local user fields for display (fallbacks)
  const userData = (user && (user.user || user)) || {};

  // token retrieval (works with different auth shapes)
  const token = (user && (user.token || user.access_token || user?.user?.token || user?.access_token)) || null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  // Dialog state
  const [emailOpen, setEmailOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    // Handle OAuth token from query string (legacy flow)
    const { token: tokenQuery } = router.query;
    if (!user && typeof tokenQuery === 'string' && tokenQuery.length > 0) {
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${tokenQuery}` },
      })
      .then(res => {
        const auth = { token: tokenQuery, user: res.data };
        localStorage.setItem('auth', JSON.stringify(auth));
        setUser(auth);
        router.replace('/dashboard');
      })
      .catch(() => {
        router.replace('/login');
      });
    }
  }, [router.query, setUser, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tests/my`, {
      headers: authHeader,
    })
      .then(res => setTests(res.data || []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;

  const handleOpenEmail = () => {
    setNewEmail(userData.email || '');
    setEmailOpen(true);
  };

  const handleEmailSave = async () => {
    setChanging(true);
    try {
      // Backend must implement POST /auth/change-email to accept { newEmail } and use auth guard
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-email`, { newEmail }, { headers: authHeader });
      // update local user object
      const updated = { ...(userData), email: newEmail };
      const auth = { ...user, user: updated };
      localStorage.setItem('auth', JSON.stringify(auth));
      setUser(auth);
      setStatusMsg('Email updated');
      setEmailOpen(false);
    } catch (err: any) {
      setStatusMsg(err?.response?.data?.message || 'Unable to update email');
    } finally {
      setChanging(false);
    }
  };

  const handleOpenPass = () => {
    setOldPassword('');
    setNewPassword('');
    setPassOpen(true);
  };

  const handlePassSave = async () => {
    if (!oldPassword || !newPassword || newPassword.length < 8) {
      setStatusMsg('Please enter your current password and a new password (min 8 chars).');
      return;
    }
    setChanging(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`, { oldPassword, newPassword }, { headers: authHeader });
      setStatusMsg('Password updated');
      setPassOpen(false);
    } catch (err: any) {
      setStatusMsg(err?.response?.data?.message || 'Unable to update password');
    } finally {
      setChanging(false);
    }
  };

  const planBadge = (plan: string) => <span className={styles.planBadge}>{plan}</span>;

  return (
    <Box className={styles.container}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" fontWeight="bold">Welcome, {userData.name || 'User'}</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Access your practice tests, progress and personalised study plans.
          </Typography>
        </Grid>
      </Grid>

      <div className={styles.grid}>
        <div className={styles.profileCard}>
          <Typography variant="h6" mb={1}>Profile</Typography>

          <div className={styles.fieldRow}>
            <div>
              <Typography className={styles.fieldLabel}>User ID</Typography>
              <Typography className={styles.fieldValue}>{userData.user_uid || userData.id}</Typography>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div>
              <Typography className={styles.fieldLabel}>Full name</Typography>
              <Typography className={styles.fieldValue}>{userData.name}</Typography>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div>
              <Typography className={styles.fieldLabel}>Email</Typography>
              <Typography className={styles.fieldValue}>{userData.email}</Typography>
            </div>
            <div>
              <Button size="small" variant="outlined" onClick={handleOpenEmail}>Edit</Button>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div>
              <Typography className={styles.fieldLabel}>Phone</Typography>
              <Typography className={styles.fieldValue}>{userData.phone || '-'}</Typography>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div>
              <Typography className={styles.fieldLabel}>Plan</Typography>
              <Typography className={styles.fieldValue}>{planBadge(userData.plan || 'Free')}</Typography>
            </div>
          </div>

          <Divider sx={{ my: 1 }} />

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="contained" onClick={handleOpenPass}>Change password</Button>
            <Button variant="text" color="error" onClick={() => { logout(); router.push('/login'); }}>Logout</Button>
          </div>

          {statusMsg && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>{statusMsg}</Typography>}
        </div>

        <div className={styles.testsCard}>
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
        </div>
      </div>

      {/* Edit email dialog */}
      <Dialog open={emailOpen} onClose={() => setEmailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Update email</DialogTitle>
        <DialogContent>
          <TextField label="New email" fullWidth value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailOpen(false)}>Cancel</Button>
          <Button onClick={handleEmailSave} disabled={changing} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Change password dialog */}
      <Dialog open={passOpen} onClose={() => setPassOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Change password</DialogTitle>
        <DialogContent>
          <TextField label="Current password" type="password" fullWidth value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="New password" type="password" fullWidth value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPassOpen(false)}>Cancel</Button>
          <Button onClick={handlePassSave} disabled={changing} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}