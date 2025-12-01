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
} from '@mui/material';
import axios from 'axios';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Progress.module.css';

/**
 * pages/progress.tsx
 *
 * - Fetches the user's tests from /api/tests/my (same shape used on dashboard)
 * - Aggregates per-topic averages, counts and pass rates
 * - Renders:
 *    - Overall completion percentage and average score
 *    - Per-topic horizontal bar chart (pure CSS/SVG, no external deps)
 *    - Sparkline timeline of recent test scores (SVG)
 *    - Key metrics cards
 *    - Auto-generated insights / recommendations
 *
 * Notes:
 * - Adds "Back to Dashboard" button at the top-left/right (explicit)
 * - Hides the global footer while this page is mounted and restores it on unmount
 */

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

/* ---------- Page component ---------- */

export default function ProgressPage(): JSX.Element {
  const { user, token: tokenFromContext } = useAuth() as any;
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
      // determine score (robust)
      const rawScore = parseNumberSafe(t.score ?? t.result ?? t.percent ?? t.percentage ?? t.points ?? null);
      if (rawScore != null) {
        totalScore += rawScore;
        scoreCount++;
        if (bestScore == null || rawScore > bestScore) bestScore = rawScore;
      }
      // completed semantic
      const status = (t.status ?? t.state ?? '').toString().toLowerCase();
      const isCompleted = (t.completed === true) || /complete|done|finished/.test(status) || (rawScore != null && rawScore > 0);
      if (isCompleted) completed++;

      // duration: prefer durationSec, else created/taken timestamps
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
        // treat pass as >= 50 or >0 if scale unknown
        const passThreshold = rawScore <= 10 ? 1 : 50; // heuristic
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
      // sort by avgScore desc (nulls last), then count desc
      if (a.avgScore == null && b.avgScore != null) return 1;
      if (b.avgScore == null && a.avgScore != null) return -1;
      if (a.avgScore != null && b.avgScore != null) return b.avgScore - a.avgScore;
      return b.count - a.count;
    });

    const overallAvg = scoreCount ? totalScore / scoreCount : null;
    const overallCompletionPercent = total ? (completed / total) * 100 : null;
    const avgTimeSeconds = durationCount ? totalDurationSeconds / durationCount : null;

    // timeline for sparkline: recentTests map to numeric scores (null -> 0)
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

  /* ---------- Insights generation (simple rules) ---------- */
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

    // find weakest topic
    const topicsWithAvg = topics.filter((t) => t.avgScore != null);
    if (topicsWithAvg.length) {
      const weakest = topicsWithAvg.reduce((a, b) => (a.avgScore! < b.avgScore! ? a : b));
      const strongest = topicsWithAvg.reduce((a, b) => (a.avgScore! > b.avgScore! ? a : b));
      out.push(`Weakest topic: ${weakest.topic} — average ${formatNumber(weakest.avgScore)}.`);
      out.push(`Strongest topic: ${strongest.topic} — average ${formatNumber(strongest.avgScore)}.`);
      // recommendation
      out.push(`Recommendation: Focus 20–30 min daily on ${weakest.topic} with targeted practice and review mistakes.`);
    }
    return out;
  }, [aggregated]);

  /* ---------- Small rendering helpers: CSS bar + sparkline ---------- */

  function TopicBar({ topicObj }: { topicObj: { topic: string; avgScore: number | null; count: number; passRate: number | null } }) {
    const value = topicObj.avgScore != null ? Math.max(0, Math.min(100, topicObj.avgScore)) : 0;
    return (
      <div className={styles.topicRow}>
        <div className={styles.topicLabel}>
          <div className={styles.topicName}>{topicObj.topic}</div>
          <div className={styles.topicMeta}>{topicObj.count} attempt{topicObj.count !== 1 ? 's' : ''}</div>
        </div>

        <div className={styles.barWrap} role="img" aria-label={`${topicObj.topic} average ${formatNumber(topicObj.avgScore)}`}>
          <div className={styles.barBg}>
            <div className={styles.barFill} style={{ width: `${value}%` }} />
          </div>
        </div>

        <div className={styles.topicValue}>
          {topicObj.avgScore == null ? '—' : `${formatNumber(topicObj.avgScore)}%`}
        </div>
      </div>
    );
  }

  function Sparkline({ points }: { points: number[] }) {
    if (!points || points.length === 0) {
      return <div className={styles.sparklineEmpty}>No recent scores</div>;
    }
    const width = Math.max(120, Math.min(600, points.length * 12));
    const height = 40;
    const max = Math.max(...points, 100);
    const min = Math.min(...points, 0);
    const norm = (v: number) => (v - min) / (max - min || 1);
    const coords = points.map((p, i) => `${(i / (points.length - 1)) * width},${height - norm(p) * height}`);
    const poly = coords.join(' ');
    const last = points[points.length - 1];
    return (
      <svg className={styles.sparkline} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recent scores sparkline">
        <polyline points={poly} fill="none" stroke="#861f41" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={(points.length - 1) / Math.max(1, points.length - 1) * width} cy={height - norm(last) * height} r={3} fill="#861f41" />
      </svg>
    );
  }

  /* ---------- Render ---------- */

  return (
    <Box sx={{ p: isMobile ? 2 : 4, maxWidth: 1200, margin: '0 auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Progress & Analytics</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Overview of your performance — per-topic trends, timeline and recommendations.</Typography>
        </Box>

        <Box>
          <Button component={Link} href="/dashboard" variant="outlined" sx={{ mr: 1 }}>Back to Dashboard</Button>
          <Button component={Link} href="/practice" variant="contained">Start practice</Button>
        </Box>
      </Stack>

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

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Recent scores</Typography>
              <Sparkline points={aggregated.timelineScores} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Last {aggregated.recentTestsCount} attempts</Typography>
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
                    <Tooltip key={t.topic} title={`${t.topic}: avg ${t.avgScore == null ? '—' : formatNumber(t.avgScore)} • ${t.count} attempts`} arrow>
                      <div>
                        <TopicBar topicObj={{ topic: t.topic, avgScore: t.avgScore, count: t.count, passRate: t.passRate }} />
                      </div>
                    </Tooltip>
                  ))}
                </Box>
              )}
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }} className={styles.card}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Recommendations</Typography>
              <Divider sx={{ mb: 1 }} />
              <Box sx={{ display: 'grid', gap: 1 }}>
                {/* Simple recommendations derived from insights */}
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