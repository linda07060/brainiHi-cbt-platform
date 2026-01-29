import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
  Tooltip,
  Divider,
  Alert,
} from '@mui/material';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Progress.module.css';

/* ---------- Small helpers (kept local to this page) ---------- */

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

function extractTopicFromTitle(title?: string) {
  if (!title) return 'Unknown';
  const idx = title.indexOf('(');
  if (idx === -1) return title.trim();
  return title.slice(0, idx).trim();
}

function parseNumberSafe(v: any): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return Number(v);
  const n = Number(String(v).trim());
  return Number.isNaN(n) ? null : n;
}

function formatPercent(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${Math.round(n)}%`;
}

function formatNumber(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return String(Math.round(n * 100) / 100);
}

/* ---------- Small plan helpers (copied from dashboard/practice) ---------- */

function normalizePlanLabel(plan?: string | null): string {
  if (!plan) return 'Free';
  const p = String(plan).trim();
  if (p === '') return 'Free';
  const low = p.toLowerCase();
  if (low.includes('tutor')) return 'Tutor';
  if (low.includes('pro')) return 'Pro';
  if (low.includes('free')) return 'Free';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function defaultLimitsForPlanLocal(planName?: string | null) {
  const name = (planName || '').toLowerCase();
  if (name.includes('free') || name === '') {
    return {
      plan: 'Free',
      limits: { testsPerDay: 1, questionCount: 10, attemptsPerTest: 1, explanationsPerMonth: 90 },
      usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
      remaining: { testsRemaining: 1, explanationsRemaining: 90 },
    } as any;
  }
  if (name.includes('pro')) {
    return {
      plan: 'Pro',
      limits: { testsPerDay: Infinity, questionCount: 20, attemptsPerTest: 2, explanationsPerMonth: 50 },
      usage: { testsPerDay: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
      remaining: { testsRemaining: Infinity, explanationsRemaining: 50 },
    } as any;
  }
  if (name.includes('tutor') || name.includes('teacher') || name.includes('tut')) {
    return {
      plan: 'Tutor',
      limits: { testsPerDay: Infinity, questionCount: 30, attemptsPerTest: Infinity, explanationsPerMonth: 1000 },
      usage: { testsPerDay: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
      remaining: { testsRemaining: Infinity, explanationsRemaining: 1000 },
    } as any;
  }
  return {
    plan: 'Free',
    limits: { testsPerDay: 1, questionCount: 10, attemptsPerTest: 1, explanationsPerMonth: 90 },
    usage: { testsPerDay: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
    remaining: { testsRemaining: 1, explanationsRemaining: 90 },
  } as any;
}

/* ---------- Page component ---------- */

export default function ProgressPage(): JSX.Element {
  const { user, token: tokenFromContext } = useAuth() as any;
  const profile = user as any; // alias for code that expects `profile`
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const authAny = user as any;
  const token: string | null =
    (tokenFromContext as string) ||
    (authAny?.token as string) ||
    (authAny?.access_token as string) ||
    (authAny?.user?.token as string) ||
    (authAny?.user?.access_token as string) ||
    getLocalAuthTokenFromStorage();

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // hide footer while on this page (restore on unmount)
  useEffect(() => {
    const footer = typeof document !== 'undefined' ? document.querySelector('footer') : null;
    const prevDisplay = footer ? footer.style.display : '';
    if (footer) footer.style.display = 'none';
    return () => {
      if (footer) footer.style.display = prevDisplay || '';
    };
  }, []);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tests, setTests] = useState<any[]>([]);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!token) {
      setTests([]);
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/tests/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = (res?.data ?? {}) as any;
      let items: any[] = [];
      if (Array.isArray(raw)) items = raw;
      else if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.items)) items = raw.items;
        else if (Array.isArray(raw.tests)) items = raw.tests;
        else if (Array.isArray(raw.data)) items = raw.data;
        else items = [];
      }
      if (mountedRef.current) setTests(items);
    } catch (err: any) {
      console.error('Progress: fetch tests error', err?.response ?? err);
      if (mountedRef.current) setError('Unable to load test history. Try again.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  /* ---------- Usage fallback (derive effectiveUsage from profile) ---------- */
  // (Progress page uses a lightweight effectiveUsage derived from profile
  //  so payment fallback logic can reason about plan limits.)
  const effectiveUsage = useMemo(() => {
    // If backend/other pages provide an admin usage API you can hook it here.
    // For now derive from profile.plan
    const plan = profile?.plan ?? profile?.planName ?? null;
    return defaultLimitsForPlanLocal(plan);
  }, [profile]);

  /* ---------- Payment / billing status (moved after effectiveUsage) ---------- */
  const [paymentStatus, setPaymentStatus] = useState<any | null>(null);
  useEffect(() => {
    let mountedLocal = true;
    const loadPaymentStatus = async () => {
      if (!token) {
        if (mountedLocal) setPaymentStatus(null);
        return;
      }
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/payments/check-access`;
        let res: any | null = null;
        try {
          res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        } catch {
          // try proxy route fallback if frontend has one
          res = await axios.get('/api/payments/check-access', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
        }
        if (!mountedLocal) return;
        setPaymentStatus(res?.data ?? null);
      } catch {
        if (!mountedLocal) return;
        // on error, set to null so fallback logic below will apply
        setPaymentStatus(null);
      }
    };
    loadPaymentStatus();
    return () => { mountedLocal = false; };
  }, [token, effectiveUsage, profile]);

  // derive effective booleans and final canStartTest logic (mirror dashboard)
  const { canStartTest, startTooltip, showPending, showNoPlan } = useMemo(() => {
    // resolve plan candidate: prefer explicit profile plan (auth/profile), otherwise server payment plan, otherwise effectiveUsage.plan
    const explicitProfilePlan =
      profile?.plan ?? profile?.planName ?? profile?.plan_name ?? null;

    const resolvedPlanCandidateRaw =
      explicitProfilePlan && normalizePlanLabel(String(explicitProfilePlan)) !== 'Free'
        ? explicitProfilePlan
        : (paymentStatus?.plan ?? effectiveUsage?.plan ?? 'Free');

    const currentPlanForPayment = normalizePlanLabel(resolvedPlanCandidateRaw ?? 'Free');
    const isFreePlanCurrent = currentPlanForPayment.toLowerCase().includes('free');
    const isPaidPlanCurrent = !isFreePlanCurrent;

    const billingValid = Boolean(
      paymentStatus && (paymentStatus.activeSubscription === true || paymentStatus.hasSuccessfulPayment === true || paymentStatus.allowed === true)
    );

    const paidBlocked = isPaidPlanCurrent && (!paymentStatus || (!paymentStatus.activeSubscription && !paymentStatus.hasSuccessfulPayment && paymentStatus.allowed !== true));

    const interactiveAllowed = isPaidPlanCurrent ? billingValid : true;

    // plan limit check using effectiveUsage
    const planLimit = effectiveUsage?.limits?.testsPerDay ?? null;
    const remaining = effectiveUsage?.remaining?.testsRemaining ?? null;
    const availabilityStatus =
      remaining === Infinity || planLimit === Infinity ? 'A'
      : (typeof remaining === 'number' && remaining > 0) ? 'B'
      : (typeof planLimit === 'number' && planLimit > 0) ? 'B'
      : 'C';

    const testAllowedByLimit = availabilityStatus !== 'C';

    const finalCanStart = testAllowedByLimit && interactiveAllowed;

    // tooltip and banners
    const planName = paymentStatus?.plan ?? profile?.plan ?? effectiveUsage?.plan ?? 'Free';
    const pendingAmount = paymentStatus?.pendingAmount ?? paymentStatus?.amount ?? null;
    const tooltip = finalCanStart ? '' :
      paidBlocked
        ? (pendingAmount ? `Payment required: ${String(pendingAmount)}` : `You selected a paid plan (${planName}) but have no active subscription.`)
        : (!testAllowedByLimit ? 'No tests remaining for today on your plan.' : '');

    const showPendingBanner = paidBlocked && !!pendingAmount;
    const showNoPlanBanner = paidBlocked && !pendingAmount && !paymentStatus;

    return { canStartTest: finalCanStart, startTooltip: tooltip, showPending: showPendingBanner, showNoPlan: showNoPlanBanner };
  }, [paymentStatus, effectiveUsage, profile]);

  /* ---------- Aggregations ---------- */

  const aggregated = useMemo(() => {
    const total = tests.length;
    let completed = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let bestScore: number | null = null;
    let totalDurationSeconds = 0;
    let durationCount = 0;

    const byTopic: Record<string, { count: number; sumScore: number; scoreCount: number; passes: number }> = {};

    const recentTests = [...tests]
      .sort((a, b) => {
        const ta = Number(a.takenAt ?? a.taken_at ?? a.createdAt ?? a.created_at ?? 0);
        const tb = Number(b.takenAt ?? b.taken_at ?? b.createdAt ?? b.created_at ?? 0);
        return tb - ta;
      })
      .slice(0, 40); // recent window

    for (const t of tests) {
      const rawScore = parseNumberSafe(t.score ?? t.result ?? t.percent ?? t.percentage ?? t.points ?? null);
      if (rawScore != null) {
        totalScore += rawScore;
        scoreCount++;
        if (bestScore == null || rawScore > bestScore) bestScore = rawScore;
      }
      const status = (t.status ?? t.state ?? '').toString().toLowerCase();
      const isCompleted = (t.completed === true) || /complete|done|finished/.test(status) || (rawScore != null && rawScore > 0);
      if (isCompleted) completed++;

      const dur = parseNumberSafe(t.durationSeconds ?? t.duration ?? t.timeTaken ?? null);
      if (dur != null) {
        totalDurationSeconds += Number(dur);
        durationCount++;
      } else {
        const start = Number(t.startedAt ?? t.started_at ?? 0);
        const end = Number(t.endedAt ?? t.ended_at ?? t.takenAt ?? t.taken_at ?? t.createdAt ?? t.created_at ?? 0);
        if (start && end && end > start) {
          const secs = Math.max(0, (end - start) / 1000);
          totalDurationSeconds += secs;
          durationCount++;
        }
      }

      const topic = extractTopicFromTitle(t.title);
      if (!byTopic[topic]) byTopic[topic] = { count: 0, sumScore: 0, scoreCount: 0, passes: 0 };
      byTopic[topic].count++;
      if (rawScore != null) {
        byTopic[topic].sumScore += rawScore;
        byTopic[topic].scoreCount++;
        const passThreshold = rawScore <= 10 ? 1 : 50;
        if (rawScore >= passThreshold) byTopic[topic].passes++;
      }
    }

    const topics = Object.keys(byTopic).map((topic) => {
      const info = byTopic[topic];
      const avg = info.scoreCount ? info.sumScore / info.scoreCount : null;
      const passRate = info.scoreCount ? (info.passes / info.scoreCount) * 100 : null;
      return {
        topic,
        count: info.count,
        avgScore: avg,
        passRate,
      };
    }).sort((a, b) => {
      if (a.avgScore == null && b.avgScore != null) return 1;
      if (b.avgScore == null && a.avgScore != null) return -1;
      if (a.avgScore != null && b.avgScore != null) return b.avgScore - a.avgScore;
      return b.count - a.count;
    });

    const overallAvg = scoreCount ? totalScore / scoreCount : null;
    const overallCompletionPercent = total ? (completed / total) * 100 : null;
    const avgTimeSeconds = durationCount ? totalDurationSeconds / durationCount : null;

    const timelineScores = recentTests
      .map((t) => {
        const s = parseNumberSafe(t.score ?? t.result ?? t.percent ?? t.percentage ?? t.points ?? null);
        if (s == null) return null;
        return Number(s);
      })
      .filter((v) => v !== null) as number[];

    return {
      total,
      completed,
      overallAvg,
      overallCompletionPercent,
      bestScore,
      avgTimeSeconds,
      topics,
      timelineScores,
      recentTestsCount: recentTests.length,
    };
  }, [tests]);

  /* ---------- Insights ---------- */

  const insights = useMemo(() => {
    const out: string[] = [];
    const { topics, overallAvg } = aggregated;
    if (aggregated.total === 0) {
      out.push('No attempts yet — start a practice test to begin tracking progress.');
      return out;
    }
    if (aggregated.overallCompletionPercent != null) {
      out.push(`Completion: ${formatPercent(aggregated.overallCompletionPercent)} of attempts finished.`);
    }
    if (overallAvg != null) {
      out.push(`Average score across attempts: ${formatNumber(overallAvg)}.`);
    }
    if (topics.length === 0) return out;

    const topicsWithAvg = topics.filter((t) => t.avgScore != null);
    if (topicsWithAvg.length) {
      const weakest = topicsWithAvg.reduce((a, b) => (a.avgScore! < b.avgScore! ? a : b));
      const strongest = topicsWithAvg.reduce((a, b) => (a.avgScore! > b.avgScore! ? a : b));
      out.push(`Weakest topic: ${weakest.topic} — average ${formatNumber(weakest.avgScore)}.`);
      out.push(`Strongest topic: ${strongest.topic} — average ${formatNumber(strongest.avgScore)}.`);
      out.push(`Recommendation: Focus 20–30 min daily on ${weakest.topic} with targeted practice and review mistakes.`);
    }
    return out;
  }, [aggregated]);

  /* ---------- Render ---------- */

  const startTooltipText = startTooltip;

  return (
    <Box sx={{ p: isMobile ? 2 : 4, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header: responsive so buttons align nicely on mobile */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          mb: 3,
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Progress & Analytics</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Overview of your performance — per-topic trends, timeline and recommendations.
          </Typography>
        </Box>

        {/* Buttons group: stacked & centered on mobile, inline on desktop */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: { xs: 'center', md: 'flex-end' },
            mt: { xs: 1, md: 0 },
            width: { xs: '100%', md: 'auto' },
          }}
        >
          <Box sx={{ width: { xs: '90%', sm: 'auto' }, maxWidth: { xs: 520, md: 'none' } }}>
            <Button
              component={Link}
              href="/dashboard"
              variant="outlined"
              fullWidth={isMobile}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                py: 1,
                borderRadius: 2,
              }}
            >
              Back to Dashboard
            </Button>
          </Box>

          <Box sx={{ width: { xs: '90%', sm: 'auto' }, maxWidth: { xs: 520, md: 'none' } }}>
            <Tooltip title={startTooltipText}>
              <span style={{ display: 'block' }}>
                <Button
                  component={Link}
                  href="/practice"
                  variant="contained"
                  disabled={!canStartTest}
                  fullWidth={isMobile}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    py: 1,
                    borderRadius: 2,
                  }}
                >
                  Start practice
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {showPending && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning" action={<Button color="inherit" size="small" component={Link} href="/subscription">Complete payment</Button>}>
            You have a pending payment. Complete payment to access tests.
          </Alert>
        </Box>
      )}

      {showNoPlan && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" action={<Button color="inherit" size="small" component={Link} href="/subscription">Complete payment</Button>}>
            You have no active plan. Kindly complete your payment to have access to practice tests.
          </Alert>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : error ? (
        <Paper sx={{ p: 3 }}><Typography color="error">{error}</Typography><Box sx={{ mt: 2 }}><Button onClick={fetchTests}>Retry</Button></Box></Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Left column: metrics & sparkline */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }} className={styles.card}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Summary</Typography>
              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'grid', gap: 1 }}>
                <Box className={styles.metricRow}>
                  <div className={styles.metricLabel}>Tests taken</div>
                  <div className={styles.metricValue}>{aggregated.total}</div>
                </Box>

                <Box className={styles.metricRow}>
                  <div className={styles.metricLabel}>Completed</div>
                  <div className={styles.metricValue}>{aggregated.completed} ({formatPercent(aggregated.overallCompletionPercent ?? null)})</div>
                </Box>

                <Box className={styles.metricRow}>
                  <div className={styles.metricLabel}>Average score</div>
                  <div className={styles.metricValue}>{aggregated.overallAvg == null ? '—' : `${formatNumber(aggregated.overallAvg)}%`}</div>
                </Box>

                <Box className={styles.metricRow}>
                  <div className={styles.metricLabel}>Best score</div>
                  <div className={styles.metricValue}>{aggregated.bestScore == null ? '—' : `${formatNumber(aggregated.bestScore)}%`}</div>
                </Box>

                <Box className={styles.metricRow}>
                  <div className={styles.metricLabel}>Avg time / test</div>
                  <div className={styles.metricValue}>{aggregated.avgTimeSeconds ? `${Math.round(aggregated.avgTimeSeconds)}s` : '—'}</div>
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }} className={styles.card}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Insights</Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'grid', gap: 1 }}>
                {insights.map((line, i) => (
                  <Typography key={i} variant="body2" color="text.secondary">• {line}</Typography>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Right column: per-topic bar chart + details */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }} className={styles.card}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Per-topic performance</Typography>
              <Divider sx={{ mb: 2 }} />

              {aggregated.topics.length === 0 ? (
                <Typography color="text.secondary">No per-topic data available yet.</Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {aggregated.topics.map((t) => (
                    <div key={t.topic} className={styles.topicRow}>
                      <div className={styles.topicLabel}>
                        <div className={styles.topicName}>{t.topic}</div>
                        <div className={styles.topicMeta}>{t.count} attempt{t.count !== 1 ? 's' : ''}</div>
                      </div>

                      <div className={styles.barWrap} role="img" aria-label={`${t.topic} average ${formatNumber(t.avgScore)}`}>
                        <div className={styles.barBg}>
                          <div className={styles.barFill} style={{ width: `${t.avgScore != null ? Math.max(0, Math.min(100, t.avgScore)) : 0}%` }} />
                        </div>
                      </div>

                      <div className={styles.topicValue}>
                        {t.avgScore == null ? '—' : `${formatNumber(t.avgScore)}%`}
                      </div>
                    </div>
                  ))}
                </Box>
              )}
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }} className={styles.card}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Recommendations</Typography>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'grid', gap: 1 }}>
                {aggregated.topics.length === 0 ? (
                  <Typography color="text.secondary">Take a few practice tests to receive personalized recommendations.</Typography>
                ) : (
                  <>
                    <Typography variant="body2">Based on your performance, here are suggested next steps:</Typography>
                    <ol>
                      <li><Typography variant="body2">Schedule targeted practice for your weakest topic (see Insights).</Typography></li>
                      <li><Typography variant="body2">Use the "Start practice" button to do 20–30 minute focused sessions.</Typography></li>
                      <li><Typography variant="body2">Enable explanations on questions you struggle with to learn faster (tracked against your quota).</Typography></li>
                    </ol>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}