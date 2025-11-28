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
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import styles from '../styles/Dashboard.module.css';
import TopicDifficultyModal from '../components/TopicDifficultyModal';
import TutorUxSnippet from '../components/TutorUxSnippet';

const ProfilePage = dynamic(() => import('./profile'), { ssr: false });
const TopicDifficultyModalAny = TopicDifficultyModal as unknown as React.ComponentType<any>;

interface UsageResponse {
  plan: string;
  limits: {
    testsPerDay: number | null;
    questionCount: number;
    attemptsPerTest: number | null;
    explanationsPerMonth: number | null;
  };
  usage: {
    testsTodayDate: string | null;
    testsTodayCount: number;
    explanationsMonth: string | null;
    explanationsCount: number;
  };
  remaining: {
    testsRemaining: number | null;
    explanationsRemaining: number | null;
  };
}

/* ---------- Helpers (unchanged + small safe JWT helpers) ---------- */

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

function resolveUserId(user: any): string {
  if (!user) return '-';
  const idCandidates = [
    user.user_uid,
    user.userId,
    user.user_id,
    user.uid,
    user.user_uuid,
    user.id,
    user.sub,
    user._id,
    user.profile?.id,
    user.data?.id,
  ];
  const found = idCandidates.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  return found !== undefined ? String(found) : '-';
}

function resolveUserPhone(user: any): string {
  if (!user) return '-';
  const phoneCandidates = [
    user.phone,
    user.phone_number,
    user.phoneNumber,
    user.mobile,
    user.msisdn,
    user.telephone,
    user.tel,
    user.profile?.phone,
    user.data?.phone,
    user.contact?.phone,
  ];
  const found = phoneCandidates.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  return found !== undefined ? String(found) : '-';
}

function defaultLimitsForPlan(planName?: string | null) {
  const name = (planName || '').toLowerCase();

  if (name.includes('free') || name === '') {
    return {
      plan: 'Free',
      limits: {
        testsPerDay: 1,
        questionCount: 10,
        attemptsPerTest: 1,
        explanationsPerMonth: 90,
      },
      usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
      remaining: { testsRemaining: 1, explanationsRemaining: 90 },
    } as UsageResponse;
  }

  if (name.includes('pro')) {
    return {
      plan: 'Pro',
      limits: { testsPerDay: Infinity, questionCount: 20, attemptsPerTest: 2, explanationsPerMonth: 50 },
      usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
      remaining: { testsRemaining: Infinity, explanationsRemaining: 50 },
    } as UsageResponse;
  }

  if (name.includes('tutor') || name.includes('teacher') || name.includes('tut')) {
    return {
      plan: 'Tutor',
      limits: { testsPerDay: Infinity, questionCount: 30, attemptsPerTest: Infinity, explanationsPerMonth: 1000 },
      usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
      remaining: { testsRemaining: Infinity, explanationsRemaining: 1000 },
    } as UsageResponse;
  }

  return {
    plan: 'Free',
    limits: { testsPerDay: 1, questionCount: 10, attemptsPerTest: 1, explanationsPerMonth: 90 },
    usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
    remaining: { testsRemaining: 1, explanationsRemaining: 90 },
  } as UsageResponse;
}

function getEffectiveUsage(serverUsage: UsageResponse | null, userPlan?: string | null): UsageResponse {
  const serverPlan = serverUsage?.plan ?? null;
  if (serverUsage && userPlan && serverPlan && serverPlan.toLowerCase() === String(userPlan).toLowerCase()) {
    return serverUsage;
  }
  if (userPlan) return defaultLimitsForPlan(userPlan);
  if (serverUsage) return serverUsage;
  return defaultLimitsForPlan(null);
}

type TestAvailability = 'A' | 'B' | 'C';

function computeTestStatus(effectiveUsage: UsageResponse | null): { status: TestAvailability; remainingLabel: string } {
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

function useCountdown(targetDate?: string | null) {
  const [remaining, setRemaining] = useState<string | null>(null);
  useEffect(() => {
    if (!targetDate) { setRemaining(null); return; }
    let mounted = true;
    const target = new Date(targetDate);
    function calc() {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { if (mounted) setRemaining('Expired'); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      if (mounted) setRemaining(`${days}d ${hours}h ${minutes}m ${secs}s`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => { mounted = false; clearInterval(id); };
  }, [targetDate]);
  return remaining;
}

function formatTakenAt(value: any) {
  if (value === undefined || value === null || value === '') return '—';
  let num: number | null = null;
  if (typeof value === 'number') num = value;
  else if (typeof value === 'string' && /^\d+$/.test(value)) num = Number(value);
  let d: Date;
  if (num != null) {
    if (num < 1e12) num = num * 1000;
    d = new Date(num);
  } else {
    d = new Date(String(value));
  }
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function extractTopicFromTitle(title?: string) {
  if (!title) return 'Unknown';
  const idx = title.indexOf('(');
  if (idx === -1) return title.trim();
  return title.slice(0, idx).trim();
}

/* ---------- New helper: robust timestamp extraction for sorting ---------- */
function getTestTimestamp(item: any): number {
  if (!item) return 0;
  const candidates = [
    item.takenAt,
    item.taken_at,
    item.taken,
    item.createdAt,
    item.created_at,
    item.takenOn,
    item.taken_on,
    item.date,
    item.timestamp,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    // numeric values
    if (typeof c === 'number' && !Number.isNaN(c)) {
      let n = c;
      if (n < 1e12) n = n * 1000;
      return Number(n);
    }
    // numeric string
    if (typeof c === 'string' && /^\d+$/.test(c)) {
      let n = Number(c);
      if (n < 1e12) n = n * 1000;
      return Number(n);
    }
    // try parse date string
    const parsed = Date.parse(String(c));
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

/* ---------- New helper to map admin settings -> UsageResponse (display only) ---------- */
function usageFromAdminSettings(planName: string | null | undefined, adminSettings: any, currentUsage: UsageResponse | null): UsageResponse | null {
  if (!adminSettings || !adminSettings.limits || !adminSettings.limits.perPlan) return null;
  const lookup = String(planName || 'free').toLowerCase();
  const planObj = adminSettings.limits.perPlan?.[lookup];
  if (!planObj) return null;

  const appDefaults = defaultLimitsForPlan(planName);

  const testsPerDay = planObj.testsPerDay !== undefined ? planObj.testsPerDay : appDefaults.limits.testsPerDay;
  const questionCount = planObj.questionCountMax !== undefined ? planObj.questionCountMax : appDefaults.limits.questionCount;
  const attemptsPerTest = planObj.attemptsPerTest !== undefined ? planObj.attemptsPerTest : appDefaults.limits.attemptsPerTest;
  const explanationsPerMonth = planObj.explanationsPerMonth !== undefined ? planObj.explanationsPerMonth : appDefaults.limits.explanationsPerMonth;

  const usageCounts = {
    testsTodayCount: currentUsage?.usage?.testsTodayCount ?? 0,
    testsTodayDate: currentUsage?.usage?.testsTodayDate ?? null,
    explanationsCount: currentUsage?.usage?.explanationsCount ?? 0,
    explanationsMonth: currentUsage?.usage?.explanationsMonth ?? null,
  };

  const testsRemaining = testsPerDay === Infinity ? Infinity : Math.max(0, (testsPerDay ?? 0) - (usageCounts.testsTodayCount ?? 0));
  const explanationsRemaining = explanationsPerMonth === Infinity ? Infinity : Math.max(0, (explanationsPerMonth ?? 0) - (usageCounts.explanationsCount ?? 0));

  return {
    plan: (planName || 'Free'),
    limits: {
      testsPerDay: typeof testsPerDay === 'number' ? testsPerDay : (testsPerDay === Infinity ? Infinity : null),
      questionCount,
      attemptsPerTest,
      explanationsPerMonth,
    },
    usage: {
      testsTodayDate: usageCounts.testsTodayDate,
      testsTodayCount: usageCounts.testsTodayCount,
      explanationsMonth: usageCounts.explanationsMonth,
      explanationsCount: usageCounts.explanationsCount,
    },
    remaining: {
      testsRemaining,
      explanationsRemaining,
    },
  } as UsageResponse;
}

/* ---------- Small JWT helpers (non-invasive) ---------- */
function parseJwtPayload(token?: string | null): any | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeExpiryValue(val: any): string | null {
  if (val === undefined || val === null) return null;
  // numeric (seconds or milliseconds)
  if (typeof val === 'number') {
    let n = val;
    if (n < 1e12) n = n * 1000;
    try {
      const d = new Date(n);
      if (!isNaN(d.getTime())) return d.toISOString();
      return null;
    } catch {
      return null;
    }
  }
  // numeric string
  if (typeof val === 'string') {
    const s = val.trim();
    if (/^\d+$/.test(s)) {
      let n = Number(s);
      if (n < 1e12) n = n * 1000;
      const d = new Date(n);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    // try parse ISO/date string
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/* ---------- Dashboard Component ---------- */

export default function Dashboard() {
  const { user, token: tokenFromContext, setUser } = useAuth() as any;
  const [userData, setUserData] = useState<any>(user ?? null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [starting, setStarting] = useState<boolean>(false);
  const [snack, setSnack] = useState<{ severity: 'success' | 'info' | 'warning' | 'error'; message: string } | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [adminSettings, setAdminSettings] = useState<any | null>(null);
  const router = useRouter();

  // filters state (use mobile-style filter UI everywhere)
  const [searchText, setSearchText] = useState<string>('');
  const [filterTopic, setFilterTopic] = useState<string>('All');
  const [filterScore, setFilterScore] = useState<string>('All'); // 'All' | '0' | '1' | '2' | '3+'
  const [filterFromDate, setFilterFromDate] = useState<string | null>(null);
  const [filterToDate, setFilterToDate] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [sessionId, setSessionId] = useState<string | number | null>(null);

  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const authAny = user as any;
  const token: string | null =
    (tokenFromContext as string) ||
    (authAny?.token as string) ||
    (authAny?.access_token as string) ||
    (authAny?.user?.token as string) ||
    (authAny?.user?.access_token as string) ||
    getLocalAuthTokenFromStorage();

  // mountedRef used by fetchTests to avoid setting state on unmounted component
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // fetchTests: reusable function to (re)load the user's tests
  const fetchTests = useCallback(async () => {
    if (!token) {
      if (mountedRef.current) {
        setTests([]);
        setLoading(false);
      }
      return;
    }
    if (mountedRef.current) setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tests/my`, { headers: { Authorization: `Bearer ${token}` } });

      // Normalize the response before passing to setTests so TypeScript always receives an array.
      const raw = (res?.data ?? {}) as any;
      if (Array.isArray(raw)) {
        if (mountedRef.current) setTests(raw);
      } else if (raw && typeof raw === 'object') {
        // common shapes: { items: [...] } or { tests: [...] } or { data: [...] }
        if (Array.isArray(raw.items)) {
          if (mountedRef.current) setTests(raw.items);
        } else if (Array.isArray(raw.tests)) {
          if (mountedRef.current) setTests(raw.tests);
        } else if (Array.isArray(raw.data)) {
          if (mountedRef.current) setTests(raw.data);
        } else {
          // not an array-shaped response: coerce to empty array to avoid type errors and unexpected UI shapes
          if (mountedRef.current) setTests([]);
        }
      } else {
        if (mountedRef.current) setTests([]);
      }
    } catch (err) {
      if (mountedRef.current) setTests([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [token]);

  // initial load + listen for external "tests-changed" events to refresh the list
  useEffect(() => {
    fetchTests();
    const handler = () => {
      try {
        fetchTests();
      } catch {}
    };
    window.addEventListener('tests-changed', handler as EventListener);
    return () => window.removeEventListener('tests-changed', handler as EventListener);
  }, [fetchTests]);

  // load profile (normalized): ensure phone + plan_expiry are populated from common variants
  useEffect(() => {
    let mountedLocal = true;
    const fetchProfile = async () => {
      if (!token) { if (mountedLocal) setUserData(null); return; }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const fetchedUser = (res?.data ?? {}) as any;

        // try to preserve previously-stored auth user so we can fall back to fields the server may omit
        let storedAuth: any = null;
        try { if (typeof window !== 'undefined') storedAuth = JSON.parse(localStorage.getItem('auth') || 'null'); } catch {}
        const prevUser = userData ?? storedAuth?.user ?? null;

        // decode token claims (non-invasive) and use as a last-resort fallback for some fields
        const tokenClaims = parseJwtPayload(token) ?? {};

        // Robust phone normalization: prefer server-provided fields but fall back to previously-known values and token claims.
        const normalizedPhone =
          fetchedUser?.phone ??
          fetchedUser?.phone_number ??
          fetchedUser?.phoneNumber ??
          fetchedUser?.mobile ??
          fetchedUser?.msisdn ??
          fetchedUser?.telephone ??
          fetchedUser?.tel ??
          fetchedUser?.contact?.phone ??
          fetchedUser?.profile?.phone ??
          fetchedUser?.data?.phone ??
          prevUser?.phone ??
          prevUser?.phone_number ??
          prevUser?.phoneNumber ??
          tokenClaims?.phone ??
          tokenClaims?.mobile ??
          tokenClaims?.msisdn ??
          null;

        // Robust plan expiry normalization: accept many common names and nested/ subscription shapes and token claims
        const normalizedPlanExpiry =
          fetchedUser?.plan_expiry ??
          fetchedUser?.planExpiry ??
          fetchedUser?.plan_expires_at ??
          fetchedUser?.plan_expires ??
          fetchedUser?.planExpiresAt ??
          fetchedUser?.subscription?.ends_at ??
          fetchedUser?.subscription?.expires_at ??
          fetchedUser?.subscription?.current_period_end ??
          fetchedUser?.subscription?.current_period_end_timestamp ??
          fetchedUser?.meta?.planExpiry ??
          prevUser?.plan_expiry ??
          prevUser?.planExpiry ??
          prevUser?.plan_expires_at ??
          normalizeExpiryValue(tokenClaims?.plan_expiry) ??
          normalizeExpiryValue(tokenClaims?.planExpiresAt) ??
          normalizeExpiryValue(tokenClaims?.plan_expires_at) ??
          normalizeExpiryValue(tokenClaims?.current_period_end) ??
          null;

        // Ensure a canonical user id is present for display
        const normalizedUid =
          fetchedUser?.user_uid ??
          prevUser?.user_uid ??
          fetchedUser?.userId ??
          prevUser?.userId ??
          fetchedUser?.id ??
          prevUser?.id ??
          tokenClaims?.user_uid ??
          tokenClaims?.userId ??
          null;

        const mergedUser = {
          ...fetchedUser,
          user_uid: normalizedUid,
          phone: normalizedPhone,
          // keep alias for other code that may read phone_number
          phone_number: fetchedUser?.phone_number ?? normalizedPhone,
          // canonical expiry field used across the dashboard (keep as ISO when possible)
          plan_expiry: normalizedPlanExpiry,
          planExpiry: fetchedUser?.planExpiry ?? normalizedPlanExpiry,
        };

        const normalizedAuth = { token, user: mergedUser };
        try { if (typeof window !== 'undefined') localStorage.setItem('auth', JSON.stringify(normalizedAuth)); } catch {}

        setUser(normalizedAuth as any);
        if (mountedLocal) setUserData(mergedUser);
      } catch {
        if (mountedLocal) setUserData(user ?? null);
      }
    };
    fetchProfile();
    return () => { mountedLocal = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // load usage
  useEffect(() => {
    let mountedLocal = true;
    const loadUsage = async () => {
      if (!token) { setUsage(null); return; }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/ai/usage`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = (res?.data ?? null) as UsageResponse | null;
        if (mountedLocal) setUsage(u);
      } catch {
        if (mountedLocal) setUsage(null);
      }
    };
    loadUsage();
    return () => { mountedLocal = false; };
  }, [token, userData]);

  // load admin persisted settings for display overrides (display-only)
  useEffect(() => {
    let mountedLocal = true;
    const loadAdminSettings = async () => {
      if (!token) { setAdminSettings(null); return; }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
        const s = (res?.data as any)?.settings ?? null;
        if (mountedLocal) setAdminSettings(s);
      } catch {
        if (mountedLocal) setAdminSettings(null);
      }
    };
    loadAdminSettings();
    return () => { mountedLocal = false; };
  }, [token, userData]);

  // Soft-limit warning listener
  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail ?? String(e);
      setSnack({ severity: 'info', message: `Server: ${detail}` });
    };
    window.addEventListener('soft-limit-warning', handler as EventListener);
    return () => window.removeEventListener('soft-limit-warning', handler as EventListener);
  }, []);

  // Redirect to login when logged out
  useEffect(() => {
    if (!userData && !token && !loggingOut && mounted) {
      if (typeof window !== 'undefined') router.replace('/login');
    }
  }, [userData, token, loggingOut, router, mounted]);

  /* ---------- Filtering logic ---------- */
  const topics = useMemo(() => {
    const setT = new Set<string>();
    for (const t of tests) {
      const topic = extractTopicFromTitle(t.title);
      setT.add(topic);
    }
    return ['All', ...Array.from(setT).sort()];
  }, [tests]);

  const filteredTests = useMemo(() => {
    const s = (searchText || '').trim().toLowerCase();
    // collect matched items first, then sort by timestamp (newest first)
    const results = tests.filter((t) => {
      // text search: title/topic/score
      if (s) {
        const title = String(t.title || '').toLowerCase();
        const topic = extractTopicFromTitle(t.title).toLowerCase();
        const scoreStr = String(t.score ?? '').toLowerCase();
        if (!title.includes(s) && !topic.includes(s) && !scoreStr.includes(s)) return false;
      }
      // topic
      if (filterTopic && filterTopic !== 'All') {
        const topic = extractTopicFromTitle(t.title);
        if (topic !== filterTopic) return false;
      }
      // score
      if (filterScore && filterScore !== 'All') {
        if (filterScore === '3+') {
          if (typeof t.score !== 'number' || t.score < 3) return false;
        } else {
          const wanted = Number(filterScore);
          if (Number.isNaN(wanted)) return false;
          if ((t.score ?? 0) !== wanted) return false;
        }
      }
      // date range
      if (filterFromDate) {
        const from = new Date(filterFromDate);
        const taken = new Date(t.takenAt ?? t.taken_at ?? t.taken ?? t.createdAt ?? t.created_at ?? t.takenOn ?? t.taken_on);
        if (isNaN(taken.getTime()) || taken < from) return false;
      }
      if (filterToDate) {
        const to = new Date(filterToDate);
        to.setHours(23, 59, 59, 999);
        const taken = new Date(t.takenAt ?? t.taken_at ?? t.taken ?? t.createdAt ?? t.created_at ?? t.takenOn ?? t.taken_on);
        if (isNaN(taken.getTime()) || taken > to) return false;
      }
      return true;
    });

    // Sort by time descending so the latest attempts appear first.
    results.sort((a, b) => {
      const ta = getTestTimestamp(a);
      const tb = getTestTimestamp(b);
      return tb - ta;
    });

    return results;
  }, [tests, searchText, filterTopic, filterScore, filterFromDate, filterToDate]);

  /* ---------- UI Actions ---------- */

  const handleClearFilters = () => {
    setSearchText('');
    setFilterTopic('All');
    setFilterScore('All');
    setFilterFromDate(null);
    setFilterToDate(null);
  };

  const handleLogout = () => {
    try { if (typeof window !== 'undefined') localStorage.removeItem('auth'); } catch {}
    try { setUser?.(null); } catch {}
    if (typeof window !== 'undefined') window.location.replace('/login');
  };

  const openPicker = () => setPickerOpen(true);

  // helper used earlier in the file scope (keeps code organized)
  function showRemaining(
    remainingVal: number | null | undefined,
    planLimit?: number | null,
    planName?: string | null,
    kind: 'tests' | 'explanations' = 'tests'
  ) {
    if (remainingVal === Infinity) return 'Unlimited';
    if (planLimit === Infinity && kind === 'tests') return 'Unlimited';
    if (kind === 'tests' && planName && /(pro|tutor|premium|enterprise)/i.test(String(planName))) return 'Unlimited';
    if (remainingVal == null) {
      if (kind === 'explanations') {
        if (planLimit === Infinity) return 'Unlimited';
        if (planLimit != null) return String(planLimit);
      }
      return '—';
    }
    return String(remainingVal);
  }

  // Countdown and expiry derived values (safe read from normalized userData)
  const expiryString = userData?.plan_expiry ? new Date(userData.plan_expiry).toISOString() : null;
  const countdown = useCountdown(expiryString);

  /* ---------- Render ---------- */

  if (!mounted) {
    return (
      <Box className={styles.container}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '45vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  const displayName = userData?.name || userData?.full_name || userData?.firstName || userData?.email?.split?.('@')?.[0] || 'User';

  // use server usage if present; otherwise, if adminSettings exist, derive usage for display only
  const serverOrAdminUsage = (() => {
    if (usage) return usage;
    if (adminSettings) {
      const adminDerived = usageFromAdminSettings(userData?.plan, adminSettings, usage);
      if (adminDerived) return adminDerived;
    }
    return null;
  })();

  const effectiveUsage = getEffectiveUsage(serverOrAdminUsage, userData?.plan);

  const expiryDisplay = userData?.plan_expiry ? new Date(userData.plan_expiry).toLocaleString() : 'No expiry';

  const headerPlanLabel = (userData?.plan || effectiveUsage.plan || 'Free');
  const testAvailability = computeTestStatus(effectiveUsage);
  const canStartTest = testAvailability.status !== 'C';
  const isTutorPlan = String(effectiveUsage?.plan || '').toLowerCase() === 'tutor';

  return (
    <Box className={styles.container}>
      <Grid container spacing={3} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} md={8}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                Welcome, {displayName}
              </Typography>
              {!isCompact && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Access your practice tests, progress and personalised study plans.
                </Typography>
              )}
            </Box>

            <Box sx={{ ml: { xs: 0, sm: 2 }, mt: { xs: 1, sm: 0 } }}>
              <Chip
                onClick={() => router.push('/pricing')}
                clickable
                label={headerPlanLabel}
                size={isCompact ? 'small' : 'medium'}
                sx={{
                  bgcolor: headerPlanLabel.toLowerCase().includes('pro') ? '#f7eef0' : headerPlanLabel.toLowerCase().includes('tutor') ? '#eef7f3' : '#f5f7fb',
                  color: headerPlanLabel.toLowerCase().includes('pro') ? '#7b1d2d' : headerPlanLabel.toLowerCase().includes('tutor') ? '#00695c' : '#333',
                  borderRadius: 2,
                  fontWeight: 700,
                  px: 1.2,
                  cursor: 'pointer',
                }}
                aria-label={`Open ${headerPlanLabel} plan details`}
              />
              {/* NEW: quick link to subscription management */}
              <Button component={Link} href="/subscription" size={isCompact ? 'small' : 'small'} variant="outlined" sx={{ ml: 1, textTransform: 'none' }}>
                Subscription
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: isCompact ? 'block' : 'none', md: 'block' }, mt: 0.5 }}>
                {userData?.plan_expiry ? `Expires: ${expiryDisplay}` : 'No expiry'}
              </Typography>
            </Box>
          </Stack>
        </Grid>

        <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
            <Tooltip title={testAvailability.status === 'C' ? 'Blocked' : 'Start a new test'}>
              <span>
                <Button
                  variant="contained"
                  color={testAvailability.status === 'A' ? 'success' : 'primary'}
                  size="medium"
                  onClick={openPicker}
                  sx={{ mr: 1, minWidth: 120, textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                  disabled={!canStartTest || starting}
                >
                  {starting ? 'Starting…' : testAvailability.status === 'B' ? `Start test (${testAvailability.remainingLabel} left)` : 'Start test'}
                </Button>
              </span>
            </Tooltip>

            <Button variant="outlined" color="inherit" onClick={handleLogout} sx={{ ml: 1, minWidth: 90, textTransform: 'none', borderRadius: 1.5 }}>
              Logout
            </Button>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }} className={styles.profileCard}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
              Profile
            </Typography>

            <Box sx={{ display: 'grid', gap: 1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary">User ID</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{resolveUserId(userData)}</Typography>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Full name</Typography>
              <Typography variant="body2">{userData?.name || '-'}</Typography>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Email</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{userData?.email || '-'}</Typography>
                <Button size="small" variant="outlined" onClick={() => router.push('/profile')} sx={{ textTransform: 'none', ml: 'auto', borderRadius: 1 }}>Edit</Button>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Phone</Typography>
              <Typography variant="body2">{resolveUserPhone(userData)}</Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Plan</Typography>
                <Chip label={effectiveUsage.plan} size="small" sx={{ bgcolor: '#f7f1f3', color: '#7b1d2d', fontWeight: 700 }} />
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="caption" color="text.secondary">Plan expiry</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{expiryDisplay}</Typography>
            {userData?.plan_expiry && <Typography variant="caption" color="text.secondary">Time left: {countdown}</Typography>}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Plan limits</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
              <Chip
                label={`${testAvailability.status} — ${testAvailability.status === 'A' ? 'Unlimited' : testAvailability.status === 'B' ? `Limited (${testAvailability.remainingLabel})` : 'Blocked'}`}
                size="small"
                sx={{
                  bgcolor: testAvailability.status === 'A' ? 'success.main' : testAvailability.status === 'B' ? 'warning.main' : 'error.main',
                  color: '#fff',
                  fontWeight: 700,
                }}
              />
              <Typography variant="caption" color="text.secondary">A = Unlimited, B = Limited, C = Blocked</Typography>
            </Box>

            <Typography variant="body2">Questions per test: <strong>{effectiveUsage.limits.questionCount}</strong></Typography>
            <Typography variant="body2">Attempts per test: <strong>{effectiveUsage.limits.attemptsPerTest === Infinity ? 'Unlimited' : effectiveUsage.limits.attemptsPerTest}</strong></Typography>
            <Typography variant="body2">Tests remaining today: <strong>{String(showRemaining(effectiveUsage.remaining.testsRemaining, effectiveUsage.limits.testsPerDay, effectiveUsage.plan, 'tests'))}</strong></Typography>
            <Typography variant="body2">AI explanations remaining: <strong>{String(showRemaining(effectiveUsage.remaining.explanationsRemaining, effectiveUsage.limits.explanationsPerMonth, effectiveUsage.plan, 'explanations'))}</strong></Typography>

            <Box sx={{ mt: 2 }}>
              {isTutorPlan ? (
                <TutorUxSnippet effectiveUsage={effectiveUsage} />
              ) : (
                <Button component={Link} href="/subscription" variant="outlined" size="small" sx={{ textTransform: 'none' }}>
                  Upgrade to Tutor
                </Button>
              )}
            </Box>

            {/* NEW: Manage subscription link placed near upgrade controls (does not alter existing logic) */}
            <Box sx={{ mt: 1 }}>
              <Button component={Link} href="/subscription" variant="text" size="small" sx={{ textTransform: 'none' }}>
                Manage subscription
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" color="secondary" onClick={() => router.push('/change-password')} sx={{ textTransform: 'none', borderRadius: 1, fontWeight: 700 }}>
                Change password
              </Button>
              <Button variant="text" color="error" onClick={handleLogout} sx={{ ml: 'auto', textTransform: 'none' }}>Logout</Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {/* Main panel: Paper with sticky header and scrollable content */}
          <Paper elevation={1} sx={{ borderRadius: 2 }}>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                bgcolor: 'background.paper',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                px: 2,
                py: 1.25,
                boxShadow: '0 1px 0 rgba(0,0,0,0.03)',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1}>
                  {/* Mobile-style filter button used on desktop as requested */}
                  <Button
                    startIcon={<FilterListIcon />}
                    onClick={() => setFilterDrawerOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Filter tests
                  </Button>

                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Past Test Attempts
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="caption" color="text.secondary">{filteredTests.length} shown</Typography>
                  <Button size="small" onClick={handleClearFilters}>Clear</Button>
                </Stack>
              </Stack>
            </Box>

            <Box
              sx={{
                px: 2,
                py: 1.5,
                // scrollable region that fits in viewport; header remains sticky
                height: isMobile ? 'calc(100vh - 220px)' : 'calc(100vh - 195px)',
                overflowY: 'auto',
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
              ) : filteredTests.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography>No test attempts yet.</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {filteredTests.map((t) => {
                    const key = t.id ?? Math.random();
                    const title = t.title ?? 'Untitled';
                    const score = t.score ?? 0;
                    const taken = formatTakenAt(t.takenAt ?? t.taken_at ?? t.taken ?? t.createdAt ?? t.created_at ?? t.takenOn ?? t.taken_on);
                    const topic = extractTopicFromTitle(title);

                    if (isMobile) {
                      return (
                        <Box key={key} sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                            <Box>
                              <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
                              <Typography variant="caption" color="text.secondary">Score: {score} • {taken}</Typography>
                            </Box>
                            <Button component={Link} href={`/review?id=${t.id}`} size="small" variant="outlined" sx={{ textTransform: 'none' }}>Review</Button>
                          </Box>
                          <Divider />
                        </Box>
                      );
                    }

                    return (
                      <React.Fragment key={key}>
                        <ListItem
                          secondaryAction={
                            <Button component={Link} href={`/review?id=${t.id}`} size="small" variant="outlined" sx={{ textTransform: 'none' }}>Review</Button>
                          }
                        >
                          <ListItemText
                            primary={title}
                            secondary={`Score: ${score} • Taken: ${taken}`}
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters drawer (same mobile-style filter used on desktop) */}
      <Drawer anchor="right" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
        <Box sx={{ width: 340, p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Filter tests</Typography>
              <IconButton onClick={() => setFilterDrawerOpen(false)}><CloseIcon /></IconButton>
            </Stack>

            <TextField
              label="Search"
              placeholder="Topic, title, or score"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="small"
              fullWidth
            />

            <FormControl fullWidth size="small">
              <InputLabel id="topic-filter-label">Topic</InputLabel>
              <Select
                labelId="topic-filter-label"
                value={filterTopic}
                label="Topic"
                onChange={(e) => setFilterTopic(String(e.target.value))}
              >
                {topics.map((tp) => <MenuItem key={tp} value={tp}>{tp}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="score-filter-label">Score</InputLabel>
              <Select
                labelId="score-filter-label"
                value={filterScore}
                label="Score"
                onChange={(e) => setFilterScore(String(e.target.value))}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="0">0</MenuItem>
                <MenuItem value="1">1</MenuItem>
                <MenuItem value="2">2</MenuItem>
                <MenuItem value="3+">3+</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1}>
              <TextField
                label="From"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filterFromDate ?? ''}
                onChange={(e) => setFilterFromDate(e.target.value || null)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="To"
                type="date"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={filterToDate ?? ''}
                onChange={(e) => setFilterToDate(e.target.value || null)}
                sx={{ flex: 1 }}
              />
            </Stack>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={handleClearFilters}>Clear</Button>
              <Button variant="contained" onClick={() => setFilterDrawerOpen(false)}>Apply</Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>

      <TopicDifficultyModalAny
        open={pickerOpen}
        initialTopic={userData?.preferredTopic || 'Algebra'}
        initialDifficulty={(userData?.preferredDifficulty as any) || 'beginner'}
        onClose={async (res?: any) => {
          onPickerClose(res);
        }}
        onStart={async (payload: any) => {
          await handleModalStart(payload);
        }}
        maxQuestions={effectiveUsage?.limits?.questionCount ?? 10}
        explanationsAllowed={(effectiveUsage?.remaining?.explanationsRemaining ?? effectiveUsage?.limits?.explanationsPerMonth) !== 0}
      />

      {/* Inline Session Modal (kept as before) */}
      <Dialog open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          Session {sessionId}
          <IconButton aria-label="close" onClick={() => setSessionModalOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {sessionLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : sessionData ? (
            <Box>
              <Typography variant="subtitle2">Source URL (fetched)</Typography>
              <Typography variant="body2" sx={{ mb: 2, wordBreak: 'break-word' }}>{String(sessionData.url ?? 'N/A')}</Typography>
              <Typography variant="subtitle2">Session / Test Data</Typography>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fafafa', padding: 12, borderRadius: 6 }}>{JSON.stringify(sessionData.data ?? sessionData, null, 2)}</pre>
            </Box>
          ) : (
            <Typography>No session data available. Inspect LAST_CREATED_TEST in sessionStorage for saved info.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={async () => {
              const info = (() => {
                try { return JSON.parse(sessionStorage.getItem('LAST_CREATED_TEST') || 'null') || null; } catch { return null; }
              })();
              const sid = sessionId ?? info?.sessionId ?? info?.payload?.sessionId ?? info?.payload?.id ?? null;
              if (!sid) { setSnack({ severity: 'info', message: 'No session id available.' }); return; }
              const origin = window.location.origin;
              const candidates = [
                `/test?session=${sid}`,
                `/tests/session/${sid}`,
                `/test/session/${sid}`,
                `/tests/${sid}`,
                `/test/${sid}`,
                `/tests?session=${sid}`,
                `/test?session=${sid}`,
              ];
              for (const p of candidates) {
                try {
                  const full = origin + p;
                  const res = await fetch(full, { method: 'GET', credentials: 'include' });
                  if (res.ok) {
                    window.location.href = full;
                    return;
                  }
                } catch {}
              }
              setSnack({ severity: 'info', message: 'No frontend page found for this session. Check LAST_CREATED_TEST in sessionStorage.' });
            }}
          >
            Open full page
          </Button>
          <Button onClick={() => setSessionModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        {snack ? (
          <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ width: '100%' }}>
            {snack.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );

  // keep/create modal handlers (copied/adapted from your previous implementation)
  async function handleModalStart(payloadOrSelection?: any) {
    try {
      if (!payloadOrSelection) return;
      const payload = payloadOrSelection as any;

      const hasQuestions = Array.isArray(payload?.questions) && payload.questions.length > 0;
      const hasSessionId = !!(payload?.sessionId || payload?.id);

      if (hasQuestions && hasSessionId) {
        try {
          const saved = { sessionId: payload.sessionId ?? payload.id, payload, token, metadata: { topic: payload.topic, difficulty: payload.difficulty } };
          if (typeof window !== 'undefined') sessionStorage.setItem('LAST_CREATED_TEST', JSON.stringify(saved));
        } catch {}
        setPickerOpen(false);
        const sid = payload.sessionId ?? payload.id;
        if (sid) {
          await router.push({ pathname: '/test', query: { session: sid } });
        }
        return;
      }

      const selection = payload;
      if (selection && (selection.topic || selection.difficulty || typeof selection.questionCount !== 'undefined')) {
        // close modal first (modal component will also close after onStart finishes)
        setPickerOpen(false);
        // create a real test session by calling the backend (this was missing/placeholder earlier)
        await createTestSession(selection.topic || 'General', selection.difficulty || 'medium', selection.questionCount, selection.useExplanations);
      }
    } catch (err) {
      setSnack({ severity: 'error', message: 'Unable to start test from modal. Try again.' });
      setPickerOpen(false);
    }
  }

  async function onPickerClose(result?: any) {
    setPickerOpen(false);
    if (!result) return;
    await createTestSession(result.topic, result.difficulty, result.questionCount, result.useExplanations);
  }

  // Real createTestSession implementation (restores previous working behavior)
  async function createTestSession(topic: string, difficulty: string, questionCount?: number, useExplanations?: boolean) {
    if (!token) {
      if (typeof window !== 'undefined') window.location.replace('/login');
      return;
    }

    setStarting(true);
    setSnack(null);

    try {
      const body: any = { topic, difficulty };
      if (typeof questionCount === 'number') body.questionCount = questionCount;
      if (typeof useExplanations === 'boolean') body.useExplanations = useExplanations;

      // use Next proxy to create test
      const createUrl = '/api/tests/create-from-ai';

      const res = await axios.post(createUrl, body, { headers: { 'Content-Type': 'application/json' }, timeout: 120000 });
      // Cast response to any to allow flexible access to sessionId/questions/items/etc.
      const serverData = (res?.data ?? {}) as any;
      const sessionIdReturned = serverData?.sessionId ?? serverData?.id ?? null;

      // detect if server returned the questions payload directly
      const hasQuestions =
        (Array.isArray(serverData?.questions) && serverData.questions.length > 0) ||
        (Array.isArray(serverData?.items) && serverData.items.length > 0) ||
        (serverData?.test && Array.isArray(serverData.test.questions) && serverData.test.questions.length > 0);

      // Persist last created test payload so Review/Test pages can use it
      try {
        const saved = { sessionId: sessionIdReturned, payload: serverData, token, metadata: { topic, difficulty, questionCount, useExplanations } };
        if (typeof window !== 'undefined') sessionStorage.setItem('LAST_CREATED_TEST', JSON.stringify(saved));
      } catch {}

      setSnack({ severity: 'success', message: `Test created${sessionIdReturned ? ` (id: ${sessionIdReturned})` : ''}.` });

      // refresh tests list so new attempt/session appears in Past Attempts
      try { await fetchTests(); } catch {}

      // if session id present navigate to /test with query (this opens the actual test)
      if (sessionIdReturned) {
        const queryObj: any = { session: sessionIdReturned };
        if (topic) queryObj.topic = topic;
        if (difficulty) queryObj.difficulty = difficulty;
        if (typeof questionCount === 'number') queryObj.questionCount = String(questionCount);
        if (typeof useExplanations === 'boolean') queryObj.useExplanations = String(Boolean(useExplanations));
        try {
          await router.push({ pathname: '/test', query: queryObj });
          return;
        } catch {
          // fallback to full redirect if push fails
          try {
            const params = new URLSearchParams(queryObj).toString();
            window.location.href = `${window.location.origin}/test?${params}`;
            return;
          } catch {}
        }
      }

      // If no sessionId returned but questions were included, optionally open session inline or navigate to test page
      if (hasQuestions && !sessionIdReturned) {
        // keep LAST_CREATED_TEST saved above; navigate to /test without session id (the test page may read LAST_CREATED_TEST)
        try {
          await router.push({ pathname: '/test' });
        } catch {
          try { window.location.href = `${window.location.origin}/test`; } catch {}
        }
      }
    } catch (err: any) {
      const dataErr = err?.response?.data;
      setSnack({ severity: 'error', message: (dataErr && dataErr.message) || 'Unable to start test. Try again later.' });
      console.error('Start test error', err?.response ?? err);
    } finally {
      setStarting(false);
    }
  }
}