import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import TopicDifficultyModal from '../components/TopicDifficultyModal';
import styles from '../styles/Practice.module.css';
import Spinner from '../components/Spinner';

/* ---------- Helpers ---------- */

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

/* small price & limits helpers mirrored from subscription page */
function mapPlanPrice(plan?: string, billingPeriod?: string) {
  const p = (plan || 'Pro').toString().toLowerCase();
  if (p.includes('pro')) {
    if (billingPeriod === 'yearly') return { amount: '99.00', currency: 'USD' };
    return { amount: '12.99', currency: 'USD' };
  }
  if (p.includes('tutor')) {
    if (billingPeriod === 'yearly') return { amount: '199.00', currency: 'USD' };
    return { amount: '24.99', currency: 'USD' };
  }
  return { amount: '0.00', currency: 'USD' };
}

function getPlanLimits(plan: string): string[] {
  const p = String(plan || '').toLowerCase();
  if (p === 'pro') {
    return ['Unlimited tests', '15–20 questions per test', '2 attempts for each test', '50 AI explanations per month', 'No time limits'];
  }
  if (p === 'tutor') {
    return [
      'Unlimited tests',
      '20–30 questions per test',
      'Unlimited attempts',
      '1000+ AI explanations per month (soft limit)',
      'Personal AI tutor in chat',
      'Full analytics of weak areas',
    ];
  }
  return ['1 test per day', '10 questions per test', '1 attempt only', 'Up to 3 AI explanations per day'];
}

/* ---------- Component ---------- */

export default function PracticePage(): JSX.Element {
  const { user, token: tokenFromContext } = useAuth() as any;
  const profile = user as any;
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
  const dialogFullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Prevent hydration flash
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Hide footer on this page (restore on unmount)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const footer = document.querySelector('footer') as HTMLElement | null;
    if (!footer) return;
    const prev = footer.style.display;
    footer.style.display = 'none';
    return () => {
      try {
        footer.style.display = prev || '';
      } catch {}
    };
  }, []);

  // UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [startingFromModal, setStartingFromModal] = useState(false);
  const [session, setSession] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [snack, setSnack] = useState<{ severity?: any; message: string } | null>(null);
  const [usage, setUsage] = useState<any | null>(null);
  const [adminSettings, setAdminSettings] = useState<any | null>(null);

  const [adaptiveMode, setAdaptiveMode] = useState(true);
  const [allowExplanations, setAllowExplanations] = useState(true);

  // load usage & admin settings
  useEffect(() => {
    let mountedLocal = true;
    const load = async () => {
      if (!token) {
        if (mountedLocal) { setUsage(null); setAdminSettings(null); }
        return;
      }
      try {
        const results = await Promise.allSettled([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/ai/usage`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!mountedLocal) return;
        const uRes = results[0];
        const aRes = results[1];
        setUsage((uRes as PromiseSettledResult<any>).status === 'fulfilled' ? (uRes as PromiseFulfilledResult<any>).value?.data ?? null : null);
        setAdminSettings((aRes as PromiseSettledResult<any>).status === 'fulfilled' ? (aRes as PromiseFulfilledResult<any>).value?.data?.settings ?? null : null);
      } catch {
        if (mountedLocal) { setUsage(null); setAdminSettings(null); }
      }
    };
    load();
    return () => { mountedLocal = false; };
  }, [token]);

  const effectiveUsage = useMemo(() => {
    if (usage) return usage;
    if (adminSettings) {
      try {
        const lookup = String(authAny?.plan || 'free').toLowerCase();
        const planObj = adminSettings?.limits?.perPlan?.[lookup];
        if (!planObj) return defaultLimitsForPlan(authAny?.plan);
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
      } catch {
        return defaultLimitsForPlan(authAny?.plan);
      }
    }
    return defaultLimitsForPlan(authAny?.plan);
  }, [usage, adminSettings, authAny?.plan]);

  const testAvailability = computeTestStatus(effectiveUsage);

  // Payment/profile flags
  const [paymentStatus, setPaymentStatus] = useState<any | null>(null);
  const [paymentLoaded, setPaymentLoaded] = useState<boolean>(false);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [canonicalPlan, setCanonicalPlan] = useState<string | null>(null);

  // Robust payment check
  useEffect(() => {
    let mountedLocal = true;
    setPaymentLoaded(false);
    const loadPaymentStatus = async () => {
      if (!token) {
        if (mountedLocal) { setPaymentStatus(null); setPaymentLoaded(true); }
        return;
      }
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/payments/check-access`;
        let response: any = null;
        try {
          response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
        } catch (errUnknown) {
          const e = errUnknown as any;
          response = e?.response ?? null;
        }

        if (!mountedLocal) return;

        if (!response || typeof response.status !== 'number') {
          setPaymentStatus({ allowed: false, reason: 'no_response' });
          setPaymentLoaded(true);
          return;
        }

        if (response.status < 200 || response.status >= 300) {
          const body = response.data;
          if (body && typeof body === 'object') {
            setPaymentStatus({ ...body, reason: `http_${response.status}` });
          } else {
            setPaymentStatus({ allowed: false, reason: `http_${response.status}`, raw: String(body ?? '') });
          }
          setPaymentLoaded(true);
          return;
        }

        const body = response.data;
        if (body && typeof body === 'object') {
          setPaymentStatus(body);
        } else {
          setPaymentStatus({ allowed: false, reason: 'non_json_body', raw: String(body ?? '') });
        }
      } catch (err) {
        if (mountedLocal) {
          setPaymentStatus({ allowed: false, reason: 'request_error', raw: String(err ?? '') });
        }
      } finally {
        if (mountedLocal) setPaymentLoaded(true);
      }
    };
    loadPaymentStatus();
    return () => { mountedLocal = false; };
  }, [token, effectiveUsage, adminSettings, usage]);

  // profileLoaded
  useEffect(() => {
    if (!token) { setProfileLoaded(true); return; }
    if (profile) {
      const planFromProfile = profile?.plan ?? profile?.planName ?? profile?.subscription?.plan ?? null;
      if (planFromProfile) setCanonicalPlan(normalizePlanLabel(String(planFromProfile)));
      setProfileLoaded(true);
      return;
    }
    let mountedLocal = true;
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || ''}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
        if (!mountedLocal) return;
        const fetchedUser = (res?.data ?? {}) as any;
        const planFromProfile = fetchedUser?.plan ?? fetchedUser?.planName ?? fetchedUser?.subscription?.plan ?? null;
        if (planFromProfile) setCanonicalPlan(normalizePlanLabel(String(planFromProfile)));
      } catch {
        // ignore
      } finally {
        if (mountedLocal) setProfileLoaded(true);
      }
    };
    fetchProfile();
    return () => { mountedLocal = false; };
  }, [token, profile]);

  const explicitProfilePlanNormalized = useMemo(() => {
    const explicit = profile?.plan ?? profile?.planName ?? canonicalPlan ?? null;
    return explicit ? normalizePlanLabel(String(explicit)) : null;
  }, [profile, canonicalPlan]);

  const profilePlanIsFree = explicitProfilePlanNormalized ? explicitProfilePlanNormalized.toLowerCase().includes('free') : null;

  const planResolved = profileLoaded || paymentLoaded;
  const resolvedPlanCandidate = useMemo(() => {
    if (!planResolved) return null;
    if (explicitProfilePlanNormalized && explicitProfilePlanNormalized !== 'Free') return explicitProfilePlanNormalized;
    const p = paymentStatus?.plan ?? paymentStatus?.planName ?? effectiveUsage?.plan ?? canonicalPlan ?? null;
    return p ? normalizePlanLabel(String(p)) : 'Free';
  }, [planResolved, explicitProfilePlanNormalized, paymentStatus, effectiveUsage, canonicalPlan]);

  const allowedByPayment = Boolean(
    paymentStatus?.allowed === true ||
    paymentStatus?.activeSubscription === true ||
    paymentStatus?.hasSuccessfulPayment === true
  );

  const billingValid = paymentLoaded && allowedByPayment;

  const canStartStrict = useMemo(() => {
    if (!profileLoaded && !paymentLoaded) return false;
    if (profileLoaded && profilePlanIsFree === true) return testAvailability.status !== 'C';
    if (!paymentLoaded) return false;
    if (billingValid) return testAvailability.status !== 'C';
    if (resolvedPlanCandidate && resolvedPlanCandidate.toLowerCase().includes('free')) return testAvailability.status !== 'C';
    return false;
  }, [profileLoaded, profilePlanIsFree, paymentLoaded, billingValid, resolvedPlanCandidate, testAvailability]);

  // stable-visible
  const [canStartVisible, setCanStartVisible] = useState<boolean>(false);
  const stableTimerRef = useRef<number | null>(null);
  const STABLE_MS = 1000;

  useEffect(() => {
    const ready = mounted && profileLoaded && paymentLoaded;
    if (!ready) {
      if (stableTimerRef.current) { clearTimeout(stableTimerRef.current); stableTimerRef.current = null; }
      setCanStartVisible(false);
      return;
    }

    if (canStartStrict && ready) {
      if (stableTimerRef.current) { clearTimeout(stableTimerRef.current); stableTimerRef.current = null; }
      stableTimerRef.current = window.setTimeout(() => {
        setCanStartVisible(true);
        stableTimerRef.current = null;
      }, STABLE_MS);
    } else {
      if (stableTimerRef.current) { clearTimeout(stableTimerRef.current); stableTimerRef.current = null; }
      setCanStartVisible(false);
    }

    return () => {
      if (stableTimerRef.current) { clearTimeout(stableTimerRef.current); stableTimerRef.current = null; }
    };
  }, [mounted, profileLoaded, paymentLoaded, canStartStrict]);

  const interactiveReady = mounted && profileLoaded && paymentLoaded;
  const isPaidPlanCurrent = Boolean(resolvedPlanCandidate && !String(resolvedPlanCandidate).toLowerCase().includes('free'));
  const interactive = canStartVisible && (!isPaidPlanCurrent || billingValid);
  const canStartFinal = interactiveReady && interactive;

  /* ---------- Complete payment modal state (mirror subscription) ---------- */
  const [completePaymentDialogOpen, setCompletePaymentDialogOpen] = useState(false);
  const [dialogPlan, setDialogPlan] = useState<string | null>(null);
  const [dialogBilling, setDialogBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [dialogPrice, setDialogPrice] = useState<{ amount: string; currency: string } | null>(null);

  const openCompletePaymentDialog = (planOverride?: string, billingOverride?: 'monthly' | 'yearly') => {
    const plan = planOverride ? normalizePlanLabel(planOverride) ?? resolvedPlanCandidate : resolvedPlanCandidate;
    const billing = billingOverride ?? billingPeriodComputed;
    setDialogPlan(plan);
    setDialogBilling(billing);
    setDialogPrice(mapPlanPrice(plan ?? resolvedPlanCandidate ?? 'Pro', billing));
    setCompletePaymentDialogOpen(true);
  };

  const closeCompletePaymentDialog = () => {
    setCompletePaymentDialogOpen(false);
    setDialogPlan(null);
    setDialogBilling('monthly');
    setDialogPrice(null);
  };

  const proceedToCheckout = async () => {
    const plan = dialogPlan ?? resolvedPlanCandidate ?? 'Pro';
    const billing = dialogBilling ?? billingPeriodComputed;
    const amount = dialogPrice?.amount ?? mapPlanPrice(plan, billing).amount;
    try {
      await router.push({ pathname: '/checkout', query: { plan, billingPeriod: billing, amount } });
    } catch {
      try { window.location.href = `${window.location.origin}/subscription`; } catch {}
    } finally {
      closeCompletePaymentDialog();
    }
  };

  /* ---------- Change plan modal & handlers (copied from subscription) ---------- */
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeSelectedPlan, setChangeSelectedPlan] = useState<string | null>(null);
  const [allowedChangeTargets, setAllowedChangeTargets] = useState<string[] | null>(null);

  const handleOpenChangePlan = () => {
    const current = (resolvedPlanCandidate ?? 'Free').toLowerCase();
    let allowed: string[] = [];
    if (current === 'free') allowed = ['Pro', 'Tutor'];
    else if (current === 'pro') allowed = ['Tutor'];
    else if (current === 'tutor') allowed = ['Pro'];
    else allowed = ['Pro', 'Tutor'];
    setAllowedChangeTargets(allowed);
    setChangeSelectedPlan(allowed.length > 0 ? allowed[0] : null);
    setChangeOpen(true);
    // close complete-payment dialog while changing plan
    closeCompletePaymentDialog();
  };

  const confirmChangePlan = async () => {
    if (!changeSelectedPlan) return;
    setChangeOpen(false);
    try {
      const amount = mapPlanPrice(changeSelectedPlan, dialogBilling ?? billingPeriodComputed).amount;
      await router.push({ pathname: '/checkout', query: { plan: changeSelectedPlan, billingPeriod: dialogBilling ?? billingPeriodComputed, amount } });
    } catch (err) {
      console.warn('navigate to checkout failed', err);
      setSnack({ severity: 'error', message: 'Unable to navigate to checkout. Please try again.' });
    }
  };

  /* ---------- Pending payment & billingPeriod detection ---------- */
  const hasPendingPayment = useMemo(() => {
    if (!resolvedPlanCandidate || String(resolvedPlanCandidate).toLowerCase() === 'free') return false;
    if (paymentStatus) {
      const active = typeof paymentStatus.activeSubscription === 'boolean' ? paymentStatus.activeSubscription : Boolean(paymentStatus.active ?? false);
      const hasPaid = Boolean(paymentStatus.hasSuccessfulPayment ?? paymentStatus.hasSuccessful ?? false);
      return !active && !hasPaid;
    }
    return true; // conservative
  }, [resolvedPlanCandidate, paymentStatus]);

  const billingFrequencyRaw = (paymentStatus?.billing_frequency ?? profile?.billing_frequency ?? 'monthly').toString().toLowerCase();
  const billingPeriodComputed = billingFrequencyRaw.includes('year') ? 'yearly' : 'monthly';

  const completePaymentTooltip = useMemo(() => {
    if (hasPendingPayment) {
      const amount = paymentStatus?.pendingAmount ?? paymentStatus?.amount ?? paymentStatus?.due_amount ?? null;
      const plan = resolvedPlanCandidate ?? 'your plan';
      if (amount) return `Pending payment: ${String(amount)} ${paymentStatus?.currency ?? 'USD'} for ${plan} (${billingPeriodComputed})`;
      const fallback = mapPlanPrice(plan, billingPeriodComputed);
      return `Pending payment: ${fallback.amount} ${fallback.currency} for ${plan} (${billingPeriodComputed})`;
    }
    return 'You have no pending payment.';
  }, [hasPendingPayment, paymentStatus, resolvedPlanCandidate, billingPeriodComputed]);

  // Tooltip for primary start/resume buttons
  const startTooltip = useMemo(() => {
    if (!interactiveReady) return 'Checking access…';
    if (!canStartFinal) {
      if (paymentStatus?.pendingAmount) return `You selected a paid plan — you have a pending payment of ${String(paymentStatus.pendingAmount)}. Please complete payment to continue.`;
      return 'You selected a paid plan — please complete payment to continue.';
    }
    return '';
  }, [interactiveReady, canStartFinal, paymentStatus]);

  // debug
  // eslint-disable-next-line no-console
  console.log('PRACTICE-RUNTIME', { mounted, profileLoaded, paymentLoaded, interactiveReady, isPaidPlanCurrent, billingValid, canStartVisible, canStartFinal, resolvedPlanCandidate, paymentStatus, hasPendingPayment });

  /* ---------- Actions (create/resume) ---------- */
  const createTestSession = useCallback(
    async (topic: string, difficulty: string, questionCount?: number, useExplanations?: boolean) => {
      if (!canStartFinal) {
        setSnack({ severity: 'warning', message: paymentStatus?.pendingAmount ? `You have a pending payment of ${String(paymentStatus.pendingAmount)}.` : 'You do not have access to start tests.' });
        return;
      }
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
    [token, router, canStartFinal, paymentStatus]
  );

  const handleResume = () => {
    if (!canStartFinal) {
      setSnack({ severity: 'warning', message: paymentStatus?.pendingAmount ? `You have a pending payment of ${String(paymentStatus.pendingAmount)}.` : 'You do not have access to resume tests.' });
      return;
    }
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

  /* ---------- Render ---------- */
  return (
    <Box className={styles.pageContainer} sx={{ pb: { xs: 12, md: 0 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Practice</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Start guided practice, adaptive mode or resume a saved session.</Typography>
        </Box>

        {/*
          Responsive actions:
          - On small screens buttons stack and are full-width for easier tapping.
          - Toggles are shown in a compact row beneath the buttons on mobile.
        */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            gap: 1,
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'center', md: 'flex-end' },
          }}
        >
          {/* Buttons group */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1, width: { xs: '100%', sm: 'auto' }, alignItems: 'center' }}>
            <Tooltip title={startTooltip} enterDelay={150} leaveDelay={50}>
              <span style={{ display: 'block', width: isMobile ? '90%' : 'auto', marginLeft: isMobile ? 'auto' : undefined, marginRight: isMobile ? 'auto' : undefined }}>
                <Button
                  onClick={() => { if (!canStartFinal) return; setModalOpen(true); }}
                  disabled={!canStartFinal}
                  variant="contained"
                  color={testAvailability.status === 'A' ? 'success' : 'primary'}
                  startIcon={startingFromModal ? <Spinner size={16} /> : undefined}
                  fullWidth={isMobile}
                  sx={{ fontWeight: 700, py: isMobile ? 1.25 : undefined, borderRadius: 2 }}
                >
                  {startingFromModal ? 'Starting…' : (testAvailability.status === 'B' ? `Start test (${testAvailability.remainingLabel} left)` : 'Start practice')}
                </Button>
              </span>
            </Tooltip>

            <Tooltip title={completePaymentTooltip} enterDelay={150} leaveDelay={50}>
              <span style={{ display: 'block', width: isMobile ? '90%' : 'auto', marginLeft: isMobile ? 'auto' : undefined, marginRight: isMobile ? 'auto' : undefined }}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => openCompletePaymentDialog(resolvedPlanCandidate ?? undefined, billingPeriodComputed)}
                  disabled={!hasPendingPayment}
                  fullWidth={isMobile}
                  sx={{ fontWeight: 700, py: isMobile ? 1.25 : undefined, borderRadius: 2 }}
                >
                  Complete payment
                </Button>
              </span>
            </Tooltip>
          </Box>

          {/* Toggles: placed below buttons on small screens */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: { xs: 1, sm: 0 }, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
            <FormControlLabel
              control={<Switch checked={adaptiveMode} onChange={(_, v) => setAdaptiveMode(v)} size="small" />}
              label="Adaptive mode"
              sx={{ '& .MuiFormControlLabel-label': { whiteSpace: 'nowrap' } }}
            />
            <FormControlLabel
              control={<Switch checked={allowExplanations} onChange={(_, v) => setAllowExplanations(v)} size="small" />}
              label="Allow explanations"
              sx={{ '& .MuiFormControlLabel-label': { whiteSpace: 'nowrap' } }}
            />
          </Box>
        </Box>
      </Stack>

      {(!canStartFinal && paymentStatus?.pendingAmount && interactiveReady) && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => openCompletePaymentDialog(resolvedPlanCandidate ?? undefined, billingPeriodComputed)}>Complete payment</Button>}>
            You have a pending payment of <strong>{String(paymentStatus.pendingAmount)}</strong>. Complete payment to access tests.
          </Alert>
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper className={`${styles.panel}`} elevation={1}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Resume session</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography color="text.secondary">You can resume a saved session on this device.</Typography>
            <Box sx={{ mt: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Tooltip title={startTooltip} enterDelay={150} leaveDelay={50}>
                  <span style={{ width: isMobile ? '100%' : undefined }}>
                    <Button variant="contained" onClick={handleResume} disabled={!canStartFinal} fullWidth={isMobile} sx={{ mr: isMobile ? 0 : 1 }}>
                      Resume
                    </Button>
                  </span>
                </Tooltip>

                <span style={{ width: isMobile ? '100%' : undefined }}>
                  <Button variant="outlined" onClick={() => { sessionStorage.removeItem('PRACTICE_SESSION'); setSnack({ severity: 'success', message: 'Saved session cleared' }); }} fullWidth={isMobile}>
                    Clear saved
                  </Button>
                </span>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper className={`${styles.panel}`} elevation={1}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>New session</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography color="text.secondary">Start a guided session (topic, difficulty, question count).</Typography>
            <Box sx={{ mt: 2 }}>
              <Tooltip title={startTooltip} enterDelay={150} leaveDelay={50}>
                <span style={{ display: 'inline-block', width: '100%' }}>
                  <Button variant="outlined" onClick={() => setModalOpen(true)} disabled={!canStartFinal} sx={{ fontWeight: 700 }} fullWidth={isMobile}>
                    Start guided session
                  </Button>
                </span>
              </Tooltip>

              {!canStartFinal && interactiveReady && <Typography color="warning.main" sx={{ mt: 1 }}>You have no tests remaining for today on your plan or your payment is not active.</Typography>}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Complete payment dialog (mirrors subscription) */}
      <Dialog open={completePaymentDialogOpen} onClose={closeCompletePaymentDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Complete payment</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              You're about to pay for the <strong>{dialogPlan ?? resolvedPlanCandidate}</strong> plan.
            </Typography>

            <Typography variant="body2" sx={{ mb: 1 }}>
              Billing period:
              <Button size="small" sx={{ ml: 1 }} onClick={() => { setDialogBilling('monthly'); setDialogPrice(mapPlanPrice(dialogPlan ?? resolvedPlanCandidate ?? 'Pro', 'monthly')); }} variant={dialogBilling === 'monthly' ? 'contained' : 'outlined'}>Monthly</Button>
              <Button size="small" sx={{ ml: 1 }} onClick={() => { setDialogBilling('yearly'); setDialogPrice(mapPlanPrice(dialogPlan ?? resolvedPlanCandidate ?? 'Pro', 'yearly')); }} variant={dialogBilling === 'yearly' ? 'contained' : 'outlined'}>Yearly</Button>
            </Typography>

            <Typography variant="h6" sx={{ mt: 2 }}>
              Amount: {dialogPrice ? `${dialogPrice.amount} ${dialogPrice.currency}` : '—'}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleOpenChangePlan}>Change plan</Button>
          <Button onClick={closeCompletePaymentDialog}>Cancel</Button>
          <Button variant="contained" onClick={proceedToCheckout}>Proceed to checkout</Button>
        </DialogActions>
      </Dialog>

      {/* Change plan dialog (copied UI from subscription) */}
      <Dialog open={changeOpen} onClose={() => setChangeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upgrade plan</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="change-plan-label">Plan</InputLabel>
              <Select
                labelId="change-plan-label"
                value={changeSelectedPlan ?? ''}
                label="Plan"
                onChange={(e) => setChangeSelectedPlan(String(e.target.value))}
              >
                {(allowedChangeTargets ?? []).filter(p => normalizePlanLabel(p) !== normalizePlanLabel(resolvedPlanCandidate ?? '')).map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Plan limits ({changeSelectedPlan ?? '—'})</Typography>
              {(changeSelectedPlan ? getPlanLimits(changeSelectedPlan) : getPlanLimits(resolvedPlanCandidate ?? 'Pro')).map((l, i) => (
                <Typography key={i} variant="body2">• {l}</Typography>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={confirmChangePlan} disabled={!changeSelectedPlan}>Proceed to checkout</Button>
        </DialogActions>
      </Dialog>

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
              if (!canStartFinal) {
                setSnack({ severity: 'warning', message: paymentStatus?.pendingAmount ? `You have a pending payment of ${String(paymentStatus.pendingAmount)}.` : 'You do not have access to start tests.' });
                return;
              }
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

      {/* Floating "Back to Dashboard" adjusted for mobile so it doesn't overlap content */}
      <Box
        className={styles.floatingAction}
        sx={{
          position: { xs: 'fixed', md: 'static' },
          bottom: { xs: 12, md: 'auto' },
          left: { xs: '50%', md: 'auto' },
          transform: { xs: 'translateX(-50%)', md: 'none' },
          width: { xs: '92%', md: 'auto' },
          zIndex: 1200,
        }}
      >
        <Button component={Link} href="/dashboard" variant="outlined" size={isSmall ? 'small' : 'medium'} fullWidth={isSmall}>
          Back to Dashboard
        </Button>
      </Box>
    </Box>
  );
}