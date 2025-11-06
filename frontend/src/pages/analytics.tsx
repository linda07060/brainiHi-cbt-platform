import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, Box, CircularProgress, Alert, Button, List, ListItem, ListItemText, Chip, Grid, Paper, Snackbar
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import TopicDifficultyModal from '../components/TopicDifficultyModal';
import SoftLimitConfirmModal from '../components/SoftLimitConfirmModal';
import useServerWarning from '../hooks/useServerWarning';

/**
 * Minimal sparkline generator: accepts an array of numbers and returns an SVG path string.
 * No external library required.
 */
function sparklinePath(values: number[], width = 120, height = 28) {
  if (!values || values.length === 0) return '';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = Math.round(i * step);
    const y = Math.round(((max - v) / range) * (height - 2)) + 1;
    return `${x},${y}`;
  });
  return `M${points.join(' L')}`;
}

/**
 * Permissive server response typing for the analytics endpoints used here.
 * Keep optional so many shapes are accepted.
 */
interface AnalyticsResponse {
  warning?: string | null;
  sessionId?: string | number;
  id?: string | number;
  attemptsCount?: number;
  weakAreas?: Array<{ area: string; misses: number; recommendedPractice: number; history?: number[] }>;
  [k: string]: any;
}

export default function AnalyticsPage() {
  const { token } = useAuth() as any;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ severity: 'success'|'info'|'warning'|'error'; message: string } | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTopic, setPickerTopic] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const { warning, clearWarning } = useServerWarning();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmProceed, setConfirmProceed] = useState<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!token) {
        router.push('/login');
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/ai/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Cast to AnalyticsResponse so accessing optional fields is allowed by TS
        const payload = (res?.data ?? {}) as AnalyticsResponse;
        if (mounted) setData(payload);
      } catch (err: any) {
        if (mounted) {
          if (err?.response?.status === 403) {
            setError('Analytics are available to Tutor plan users only. Upgrade to access full analytics.');
          } else {
            // Cast err.response?.data to any to avoid TS complaints
            const serverMsg = (err?.response?.data as any)?.message ?? 'Unable to load analytics.';
            setError(serverMsg);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [token, router]);

  // If global warning dispatches, surface inline
  useEffect(() => {
    if (warning) {
      setSnack({ severity: 'info', message: `Warning: ${warning}` });
      clearWarning();
    }
  }, [warning, clearWarning]);

  const weakAreas: Array<{ area: string; misses: number; recommendedPractice: number; history?: number[] }> = useMemo(() => {
    if (!data?.weakAreas) return [];
    return (data.weakAreas || []).map((w: any) => ({
      area: w.area,
      misses: w.misses,
      recommendedPractice: w.recommendedPractice,
      history: w.history || [Math.max(0, w.misses - 2), w.misses - 1, w.misses], // fallback sample trend
    }));
  }, [data]);

  // Create a focused test (Practice button). Will POST to create-from-ai with the area as topic.
  const createFocusedTest = async (topic: string, questionCount = 10) => {
    if (!token) { router.push('/login'); return; }
    setCreating(true);
    setSnack(null);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/tests/create-from-ai`,
        { topic, questionCount },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 },
      );

      // Cast response to AnalyticsResponse-like shape so TS allows .warning
      const resp = (res?.data ?? {}) as AnalyticsResponse;

      // If server returns a warning (soft-limit on explanations), surface it inline here
      if (resp.warning) {
        setSnack({ severity: 'warning', message: String(resp.warning) });
      }

      const sessionId = resp.sessionId ?? resp.id ?? null;
      if (sessionId) {
        // Refresh usage then navigate
        try {
          await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/ai/usage`, { headers: { Authorization: `Bearer ${token}` } });
        } catch {}
        router.push(`/test/session/${sessionId}`);
      } else {
        setSnack({ severity: 'info', message: 'Test created. Open Tests page to view your session.' });
      }
    } catch (err: any) {
      const serverMsg = (err?.response?.data as any)?.message ?? 'Unable to create practice test.';
      setSnack({ severity: 'error', message: String(serverMsg) });
    } finally {
      setCreating(false);
    }
  };

  // Optionally show confirmation modal before calling createFocusedTest if you want to require acknowledgement
  const practiceWithConfirm = (area: string) => {
    // Simple heuristic: if explanationsRemaining is low and user is Tutor we may warn — but server is authoritative.
    setConfirmOpen(true);
    setPickerTopic(area);
    setConfirmProceed(() => async () => {
      setConfirmOpen(false);
      await createFocusedTest(area,  Math.min( Math.max(5, 10), 30 ) );
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" mb={2}>Analytics</Typography>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
          <Box sx={{ mt: 1 }}>
            <Button component={Link} href="/pricing" variant="outlined" size="small">Upgrade to Tutor</Button>
          </Box>
        </Alert>
      )}

      {!loading && !error && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1">Summary</Typography>
              <Typography variant="body2" color="text.secondary">Total attempts analyzed: <strong>{data?.attemptsCount ?? 0}</strong></Typography>
              <Typography variant="body2" color="text.secondary">Weak areas identified: <strong>{weakAreas.length}</strong></Typography>
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => router.push('/ai-tutor')}>Open AI Tutor</Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Weak areas & practice</Typography>

              {weakAreas.length === 0 && (
                <Typography variant="body2">No weak areas identified yet. Take a few tests and come back.</Typography>
              )}

              <List>
                {weakAreas.map((w, i) => (
                  <ListItem key={i} divider alignItems="flex-start" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <Box>
                        <Typography variant="subtitle2">{w.area}</Typography>
                        <Typography variant="body2" color="text.secondary">Misses: {w.misses}</Typography>
                      </Box>

                      <Box sx={{ textAlign: 'right' }}>
                        <Chip label={`Practice ${w.recommendedPractice}`} size="small" sx={{ mb: 1 }} />
                        <Box>
                          <Button size="small" variant="outlined" onClick={() => practiceWithConfirm(w.area)} disabled={creating}>Practice</Button>
                        </Box>
                      </Box>
                    </Box>

                    {/* Sparkline */}
                    <Box sx={{ mt: 1 }}>
                      <svg width="100%" height="36" viewBox="0 0 120 28" preserveAspectRatio="none">
                        <path d={sparklinePath(w.history || [], 120, 28)} fill="none" stroke="#1976d2" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                      </svg>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      )}

      <SoftLimitConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { if (confirmProceed) confirmProceed(); }}
        title="Proceed with practice?"
        message="This practice will generate AI explanations. If your usage exceeds the Tutor soft-limit you may see a soft-limit warning. Proceed?"
        confirmLabel="Proceed"
        cancelLabel="Cancel"
      />

      <Snackbar open={!!snack} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} autoHideDuration={6000} onClose={() => setSnack(null)}>
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  );
}