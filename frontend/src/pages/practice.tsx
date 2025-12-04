import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FlagIcon from '@mui/icons-material/Flag';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import TopicDifficultyModal from '../components/TopicDifficultyModal';
import styles from '../styles/Practice.module.css';
import Spinner from '../components/Spinner';

/* ---------- Helpers (unchanged) ---------- */

function getLocalAuthTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

function defaultLimitsForPlan(planName?: string | null) {
  const name = (planName || '').toLowerCase();
  if (name.includes('free') || name === '') {
    return {
      plan: 'Free',
      limits: { testsPerDay: 1, questionCount: 10, attemptsPerTest: 1, explanationsPerMonth: 90 },
      remaining: { testsRemaining: 1, explanationsRemaining: 90 },
    } as any;
  }
  if (name.includes('pro')) {
    return {
      plan: 'Pro',
      limits: { testsPerDay: Infinity, questionCount: 20, attemptsPerTest: 2, explanationsPerMonth: 50 },
      remaining: { testsRemaining: Infinity, explanationsRemaining: 50 },
    } as any;
  }
  if (name.includes('tutor') || name.includes('teacher') || name.includes('tut')) {
    return {
      plan: 'Tutor',
      limits: { testsPerDay: Infinity, questionCount: 30, attemptsPerTest: Infinity, explanationsPerMonth: 1000 },
      remaining: { testsRemaining: Infinity, explanationsRemaining: 1000 },
    } as any;
  }
  return {
    plan: 'Free',
    limits: { testsPerDay: 1, questionCount: 10, attemptsPerTest: 1, explanationsPerMonth: 90 },
    remaining: { testsRemaining: 1, explanationsRemaining: 90 },
  } as any;
}

function computeTestStatus(effectiveUsage: any | null): { status: 'A' | 'B' | 'C'; remainingLabel: string } {
  const planName = effectiveUsage?.plan ?? null;
  const planLimit = effectiveUsage?.limits?.testsPerDay ?? null;
  const remaining = effectiveUsage?.remaining?.testsRemaining ?? null;

  if (remaining === Infinity || planLimit === Infinity) return { status: 'A', remainingLabel: 'Unlimited' };
  if (typeof remaining === 'number' && remaining > 0) return { status: 'B', remainingLabel: String(remaining) };
  if (planName && /(pro|tutor|premium|enterprise)/i.test(String(planName))) return { status: 'A', remainingLabel: 'Unlimited' };
  if (typeof remaining === 'number' && remaining === 0) return { status: 'C', remainingLabel: '0' };
  if (typeof planLimit === 'number' && planLimit > 0) return { status: 'B', remainingLabel: String(planLimit) };
  return { status: 'C', remainingLabel: remaining == null ? '—' : String(remaining) };
}

/* ---------- Component ---------- */

export default function PracticePage(): JSX.Element {
  const { user, token: tokenFromContext } = useAuth() as any;
  const authAny = user as any;

  const token: string | null =
    (tokenFromContext as string) ||
    (authAny?.token as string) ||
    (authAny?.access_token as string) ||
    getLocalAuthTokenFromStorage();

  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  // hide footer while on this page
  useEffect(() => {
    const footer = typeof document !== 'undefined' ? document.querySelector('footer') : null;
    const prevDisplay = footer ? footer.style.display : '';
    if (footer) footer.style.display = 'none';
    return () => {
      if (footer) footer.style.display = prevDisplay || '';
    };
  }, []);

  // UI & session state
  const [modalOpen, setModalOpen] = useState(false);
  const [startingFromModal, setStartingFromModal] = useState(false);
  const [session, setSession] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [snack, setSnack] = useState<{ severity?: any; message: string } | null>(null);
  const [usage, setUsage] = useState<any | null>(null);
  const [adminSettings, setAdminSettings] = useState<any | null>(null);

  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [allowExplanations, setAllowExplanations] = useState(true);

  // fetch usage & admin settings
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!token) {
        if (mounted) {
          setUsage(null);
          setAdminSettings(null);
        }
        return;
      }
      try {
        const results = await Promise.allSettled([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/ai/usage`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!mounted) return;

        const uRes = results[0];
        const aRes = results[1];

        if ((uRes as PromiseSettledResult<any>).status === 'fulfilled') {
          setUsage((uRes as PromiseFulfilledResult<any>).value?.data ?? null);
        } else {
          setUsage(null);
        }

        if ((aRes as PromiseSettledResult<any>).status === 'fulfilled') {
          const fulfilled = (aRes as PromiseFulfilledResult<any>).value;
          setAdminSettings(fulfilled?.data?.settings ?? null);
        } else {
          setAdminSettings(null);
        }
      } catch {
        if (mounted) {
          setUsage(null);
          setAdminSettings(null);
        }
      }
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  // derive effective usage
  const effectiveUsage = useMemo(() => {
    if (usage) return usage;
    if (adminSettings) {
      try {
        const lookup = String(authAny?.plan || 'free').toLowerCase();
        const planObj = adminSettings?.limits?.perPlan?.[lookup];
        if (planObj) {
          const appDefaults = defaultLimitsForPlan(authAny?.plan);
          const testsPerDay = planObj.testsPerDay ?? appDefaults.limits.testsPerDay;
          const questionCount = planObj.questionCountMax ?? appDefaults.limits.questionCount;
          const attemptsPerTest = planObj.attemptsPerTest ?? appDefaults.limits.attemptsPerTest;
          const explanationsPerMonth = planObj.explanationsPerMonth ?? appDefaults.limits.explanationsPerMonth;
          return {
            plan: authAny?.plan ?? 'Free',
            limits: { testsPerDay, questionCount, attemptsPerTest, explanationsPerMonth },
            usage: { testsTodayCount: 0, testsTodayDate: null, explanationsCount: 0, explanationsMonth: null },
            remaining: { testsRemaining: testsPerDay === Infinity ? Infinity : testsPerDay, explanationsRemaining: explanationsPerMonth === Infinity ? Infinity : explanationsPerMonth },
          } as any;
        }
      } catch {}
    }
    return defaultLimitsForPlan(authAny?.plan);
  }, [usage, adminSettings, authAny?.plan]);

  const testAvailability = computeTestStatus(effectiveUsage);
  const canStartTest = testAvailability.status !== 'C';

  /* createTestSession (mirrors dashboard Start Test behavior) */
  const createTestSession = useCallback(
    async (topic: string, difficulty: string, questionCount?: number, useExplanations?: boolean) => {
      if (!token) {
        try { if (typeof window !== 'undefined') window.location.replace('/login'); } catch {}
        return;
      }
      setStartingFromModal(true);
      try {
        const body: any = { topic, difficulty };
        if (typeof questionCount === 'number') body.questionCount = questionCount;
        if (typeof useExplanations === 'boolean') body.useExplanations = useExplanations;

        const res = await axios.post('/api/tests/create-from-ai', body, { headers: { 'Content-Type': 'application/json' }, timeout: 120000 });
        const serverData = (res?.data ?? {}) as any;
        const sessionIdReturned = serverData?.sessionId ?? serverData?.id ?? null;

        try {
          const saved = { sessionId: sessionIdReturned, payload: serverData, metadata: { topic, difficulty, questionCount, useExplanations } };
          if (typeof window !== 'undefined') sessionStorage.setItem('LAST_CREATED_TEST', JSON.stringify(saved));
        } catch {}

        const rawQuestions = serverData.questions ?? serverData.items ?? serverData.test?.questions ?? [];
        const hasQuestions = Array.isArray(rawQuestions) && rawQuestions.length > 0;

        if (hasQuestions) {
          const questions = (Array.isArray(rawQuestions) ? rawQuestions : []).map((q: any, i: number) => ({
            id: q.id ?? q.questionId ?? `q-${i}`,
            text: q.text ?? q.prompt ?? q.question ?? '',
            choices: q.choices ?? q.options ?? q.answers ?? [],
            difficulty: q.difficulty ?? difficulty,
            meta: q,
          }));
          const s = {
            sessionId: sessionIdReturned ?? `local-${Date.now()}`,
            topic,
            difficulty,
            questionCount: questions.length,
            questions,
            answers: {},
            flags: {},
            currentIndex: 0,
            elapsedSec: 0,
            startedAt: Date.now(),
          };
          setSession(s);
          try { sessionStorage.setItem('PRACTICE_SESSION', JSON.stringify(s)); } catch {}
          window.dispatchEvent(new CustomEvent('tests-changed', { detail: { reason: 'created', sessionId: s.sessionId } }));
          return;
        }

        if (sessionIdReturned) {
          try {
            await router.push({ pathname: '/test', query: { session: sessionIdReturned, topic, difficulty, questionCount: String(questionCount || '') } });
            return;
          } catch {
            try { window.location.href = `${window.location.origin}/test?session=${sessionIdReturned}`; return; } catch {}
          }
        }

        try {
          await router.push('/test');
        } catch {
          try { window.location.href = `${window.location.origin}/test`; } catch {}
        }
      } catch (err: any) {
        const dataErr = err?.response?.data;
        setSnack({ severity: 'error', message: (dataErr && dataErr.message) || 'Unable to start test. Try again later.' });
        console.error('createTestSession error', err?.response ?? err);
      } finally {
        setStartingFromModal(false);
        setModalOpen(false);
      }
    },
    [token, router]
  );

  /* resume / clear saved handlers */
  const handleResume = () => {
    try {
      const raw = sessionStorage.getItem('PRACTICE_SESSION');
      if (!raw) {
        setSnack({ severity: 'info', message: 'No saved session' });
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.questions)) {
        setSnack({ severity: 'info', message: 'No saved session' });
        return;
      }
      setSession(parsed);
      setRunning(true);
      setSnack({ severity: 'success', message: 'Resumed saved session' });
    } catch {
      setSnack({ severity: 'error', message: 'Unable to resume saved session' });
    }
  };

  const handleClearSaved = () => {
    try {
      sessionStorage.removeItem('PRACTICE_SESSION');
      setSnack({ severity: 'success', message: 'Saved session cleared' });
    } catch {
      setSnack({ severity: 'error', message: 'Unable to clear saved session' });
    }
  };

  const startButtonLabel = startingFromModal
    ? 'Starting…'
    : testAvailability.status === 'B'
      ? `Start test (${testAvailability.remainingLabel} left)`
      : 'Start practice';

  // Dialog fullScreen on very small screens
  const dialogFullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box className={styles.pageContainer}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Practice</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Start guided practice, adaptive mode or resume a saved session.</Typography>
        </Box>

        {/* NEW: actionsWrap centers and limits the width of the Start practice button on small screens */}
        <div className={styles.actionsWrap}>
          <Stack direction="row" spacing={2} alignItems="center" className={styles.actionsInner}>
            <FormControlLabel control={<Switch checked={adaptiveMode} onChange={(_, v) => setAdaptiveMode(v)} />} label="Adaptive mode" />
            <FormControlLabel control={<Switch checked={allowExplanations} onChange={(_, v) => setAllowExplanations(v)} />} label="Allow explanations" />
          </Stack>

          <Button
            variant="contained"
            color={testAvailability.status === 'A' ? 'success' : 'primary'}
            onClick={() => setModalOpen(true)}
            disabled={!canStartTest || startingFromModal}
            startIcon={startingFromModal ? <Spinner size={16} /> : undefined}
            sx={{ fontWeight: 700 }}
            className={styles.startBtn}
          >
            {startButtonLabel}
          </Button>
        </div>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper className={`${styles.panel}`} elevation={1}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Resume session</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography color="text.secondary">You can resume a saved session on this device.</Typography>
            <Box sx={{ mt: 2 }}>
              <div className={styles.buttonGroup}>
                <Button variant="contained" onClick={handleResume} fullWidth={isMobile} sx={{ mr: isMobile ? 0 : 1 }}>Resume</Button>
                <Button variant="outlined" onClick={handleClearSaved} fullWidth={isMobile}>Clear saved</Button>
              </div>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper className={`${styles.panel}`} elevation={1}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>New session</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography color="text.secondary">Start a guided session (topic, difficulty, question count).</Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={() => setModalOpen(true)} disabled={!canStartTest} sx={{ fontWeight: 700 }} fullWidth={isMobile}>
                Start guided session
              </Button>
              {!canStartTest && <Typography color="warning.main" sx={{ mt: 1 }}>You have no tests remaining for today on your plan.</Typography>}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {session && (
        <Box sx={{ mt: 3 }}>
          <Paper className={styles.panel} elevation={1}>
            <Stack direction={isSmall ? 'column' : 'row'} justifyContent="space-between" alignItems="center" spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>{session.topic} — {session.difficulty}</Typography>
              <Stack direction={isSmall ? 'column' : 'row'} spacing={1} alignItems="center" sx={{ width: isSmall ? '100%' : 'auto' }}>
                <Button onClick={() => { setRunning((r) => !r); }} variant="outlined" startIcon={running ? <PauseIcon /> : <PlayArrowIcon />} fullWidth={isSmall}>
                  {running ? 'Pause' : 'Resume'}
                </Button>
                <Button onClick={() => { try { sessionStorage.setItem('PRACTICE_SESSION', JSON.stringify(session)); setSnack({ severity: 'success', message: 'Saved' }); } catch { setSnack({ severity: 'error', message: 'Save failed' }); } }} variant="outlined" fullWidth={isSmall}>Save</Button>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography color="text.secondary">Questions: {session.questions?.length ?? 0}</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">This interactive view is intentionally compact — full review and grading happen on the Review/Test page (opened after creation).</Typography>
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" component={Link} href={session.sessionId ? `/test?session=${session.sessionId}` : '/test'} fullWidth={isSmall}>
                  Open test page
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="sm" fullScreen={dialogFullScreen}>
        <DialogTitle>Start guided session</DialogTitle>
        <DialogContent dividers>
          <TopicDifficultyModal
            open={true}
            initialTopic={undefined}
            initialDifficulty={'medium' as any}
            onClose={(res?: any) => {
              setModalOpen(false);
              if (!res) return;
              const maxQuestions = effectiveUsage?.limits?.questionCount ?? 10;
              const qCount = Math.min(Number(res.questionCount || maxQuestions), maxQuestions);
              createTestSession(res.topic, res.difficulty, qCount, allowExplanations && !!res.useExplanations);
            }}
            maxQuestions={effectiveUsage?.limits?.questionCount ?? 10}
            explanationsAllowed={(effectiveUsage?.remaining?.explanationsRemaining ?? effectiveUsage?.limits?.explanationsPerMonth) !== 0}
          />
        </DialogContent>
        <DialogActions className={styles.dialogActionsResponsive}>
          <Button onClick={() => setModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {snack && (
        <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={snack.severity || 'info'} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
            {snack.message}
          </Alert>
        </Snackbar>
      )}

      {/* Back to Dashboard button - responsive placement */}
      <Box className={styles.floatingAction}>
        <Button component={Link} href="/dashboard" variant="outlined" size={isSmall ? 'small' : 'medium'}>
          Back to Dashboard
        </Button>
      </Box>
    </Box>
  );
}