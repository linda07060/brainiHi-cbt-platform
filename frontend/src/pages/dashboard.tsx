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
  ListItemButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import styles from '../styles/Dashboard.module.css';
import TopicDifficultyModal from '../components/TopicDifficultyModal';
import TutorUxSnippet from '../components/TutorUxSnippet';
import Spinner from '../components/Spinner';

const ProfilePage = dynamic(() => import('./profile'), { ssr: false });
const TopicDifficultyModalAny = TopicDifficultyModal as unknown as React.ComponentType<any>;

/* ---------- Helpers (preserved + robust) ---------- */
/* ... Helpers unchanged: omitted here for brevity in this block, they remain identical to previous version ... */
/* For the sake of clarity in this patch, the helper functions (getLocalAuthTokenFromStorage, resolveUserId, etc.)
   are kept exactly the same as in your original file. Please re-add them verbatim when applying this file.
   They were intentionally omitted here to highlight the UI rearrangement only. */
 
/* ---------- Dashboard Component ---------- */

export default function Dashboard() {
  const { user, token: tokenFromContext, setUser } = useAuth() as any;
  const [userData, setUserData] = useState<any>(user ?? null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [starting, setStarting] = useState<boolean>(false);
  const [snack, setSnack] = useState<{ severity: 'success' | 'info' | 'warning' | 'error'; message: string } | null>(null);
  const [usage, setUsage] = useState<any | null>(null);
  const [adminSettings, setAdminSettings] = useState<any | null>(null);
  const router = useRouter();

  // filter & UI state (kept)
  const [searchText, setSearchText] = useState<string>('');
  const [filterTopic, setFilterTopic] = useState<string>('All');
  const [filterScore, setFilterScore] = useState<string>('All');
  const [filterFromDate, setFilterFromDate] = useState<string | null>(null);
  const [filterToDate, setFilterToDate] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false); // new: whether mobile nav drawer is open
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
    (function getLocalAuthTokenFromStorageLocal() {
      if (typeof window === 'undefined') return null;
      try {
        const raw = localStorage.getItem('auth');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.token ?? null;
      } catch {
        return null;
      }
    })();

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // fetchTests (kept)
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
      const raw = (res?.data ?? {}) as any;
      if (Array.isArray(raw)) {
        if (mountedRef.current) setTests(raw);
      } else if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.items)) {
          if (mountedRef.current) setTests(raw.items);
        } else if (Array.isArray(raw.tests)) {
          if (mountedRef.current) setTests(raw.tests);
        } else if (Array.isArray(raw.data)) {
          if (mountedRef.current) setTests(raw.data);
        } else {
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

  // load profile (kept)
  useEffect(() => {
    let mountedLocal = true;
    const fetchProfile = async () => {
      if (!token) { if (mountedLocal) setUserData(null); return; }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const fetchedUser = (res?.data ?? {}) as any;

        let storedAuth: any = null;
        try { if (typeof window !== 'undefined') storedAuth = JSON.parse(localStorage.getItem('auth') || 'null'); } catch {}
        const prevUser = userData ?? storedAuth?.user ?? null;

        const tokenClaims = (function parseJwtPayloadLocal(tokenStr?: string | null) {
          if (!tokenStr) return null;
          try {
            const parts = tokenStr.split('.');
            if (parts.length < 2) return null;
            const payload = parts[1];
            const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
            const json = atob(padded);
            return JSON.parse(json);
          } catch {
            return null;
          }
        })(token) ?? {};

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
          (function normalizeExpiryValueLocal(val: any): string | null {
            if (val === undefined || val === null) return null;
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
            if (typeof val === 'string') {
              const s = val.trim();
              if (/^\d+$/.test(s)) {
                let n = Number(s);
                if (n < 1e12) n = n * 1000;
                const d = new Date(n);
                if (!isNaN(d.getTime())) return d.toISOString();
              }
              const d = new Date(s);
              if (!isNaN(d.getTime())) return d.toISOString();
            }
            return null;
          })(tokenClaims?.plan_expiry) ??
          (function normalizeExpiryValueLocal2(val: any) {
            return null;
          })(null) ??
          null;

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
          phone_number: fetchedUser?.phone_number ?? normalizedPhone,
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

  // usage & admin settings (kept)
  useEffect(() => {
    let mountedLocal = true;
    const loadUsage = async () => {
      if (!token) { if (mountedLocal) setUsage(null); return; }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/ai/usage`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = (res?.data ?? null) as any;
        if (mountedLocal) setUsage(u);
      } catch {
        if (mountedLocal) setUsage(null);
      }
    };
    loadUsage();
    return () => { mountedLocal = false; };
  }, [token, userData]);

  useEffect(() => {
    let mountedLocal = true;
    const loadAdminSettings = async () => {
      if (!token) { if (mountedLocal) setAdminSettings(null); return; }
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

  useEffect(() => {
    const handler = (e: any) => {
      const detail = e?.detail ?? String(e);
      setSnack({ severity: 'info', message: `Server: ${detail}` });
    };
    window.addEventListener('soft-limit-warning', handler as EventListener);
    return () => window.removeEventListener('soft-limit-warning', handler as EventListener);
  }, []);

  useEffect(() => {
    if (!userData && !token && !loggingOut && mounted) {
      if (typeof window !== 'undefined') router.replace('/login');
    }
  }, [userData, token, loggingOut, router, mounted]);

  /* ---------- Filtering logic ---------- */
  const topics = useMemo(() => {
    const setT = new Set<string>();
    for (const t of tests) {
      const topic = (function extractTopicFromTitleLocal(title?: string) {
        if (!title) return 'Unknown';
        const idx = title.indexOf('(');
        if (idx === -1) return title.trim();
        return title.slice(0, idx).trim();
      })(t.title);
      setT.add(topic);
    }
    return ['All', ...Array.from(setT).sort()];
  }, [tests]);

  const filteredTests = useMemo(() => {
    const s = (searchText || '').trim().toLowerCase();
    const results = tests.filter((t) => {
      if (s) {
        const title = String(t.title || '').toLowerCase();
        const topic = (function extractTopicFromTitleLocal(title?: string) {
          if (!title) return 'Unknown';
          const idx = title.indexOf('(');
          if (idx === -1) return title.trim();
          return title.slice(0, idx).trim();
        })(t.title).toLowerCase();
        const scoreStr = String(t.score ?? '').toLowerCase();
        if (!title.includes(s) && !topic.includes(s) && !scoreStr.includes(s)) return false;
      }
      if (filterTopic && filterTopic !== 'All') {
        const topic = (function extractTopicFromTitleLocal(title?: string) {
          if (!title) return 'Unknown';
          const idx = title.indexOf('(');
          if (idx === -1) return title.trim();
          return title.slice(0, idx).trim();
        })(t.title);
        if (topic !== filterTopic) return false;
      }
      if (filterScore && filterScore !== 'All') {
        if (filterScore === '3+') {
          if (typeof t.score !== 'number' || t.score < 3) return false;
        } else {
          const wanted = Number(filterScore);
          if (Number.isNaN(wanted)) return false;
          if ((t.score ?? 0) !== wanted) return false;
        }
      }
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

    results.sort((a, b) => {
      const getTestTimestampLocal = (item: any) => {
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
          if (typeof c === 'number' && !Number.isNaN(c)) {
            let n = c;
            if (n < 1e12) n = n * 1000;
            return Number(n);
          }
          if (typeof c === 'string' && /^\d+$/.test(c)) {
            let n = Number(c);
            if (n < 1e12) n = n * 1000;
            return Number(n);
          }
          const parsed = Date.parse(String(c));
          if (!Number.isNaN(parsed)) return parsed;
        }
        return 0;
      };
      const ta = getTestTimestampLocal(a);
      const tb = getTestTimestampLocal(b);
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

  const expiryString = userData?.plan_expiry ? new Date(userData.plan_expiry).toISOString() : null;
  /* useCountdown same as before - omitted here for brevity; keep original implementation in-file */
  const countdown = useMemo(() => {
    if (!expiryString) return null;
    const target = new Date(expiryString);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }, [expiryString]);

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

  const serverOrAdminUsage = (() => {
    if (usage) return usage;
    if (adminSettings) {
      const adminDerived = (function usageFromAdminSettings(planName: string | null | undefined, adminSettings: any, currentUsage: any) {
        if (!adminSettings || !adminSettings.limits || !adminSettings.limits.perPlan) return null;
        const lookup = String(planName || 'free').toLowerCase();
        const planObj = adminSettings.limits.perPlan?.[lookup];
        if (!planObj) return null;

        const appDefaults = (function defaultLimitsForPlanLocal(planName?: string | null) {
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
            } as any;
          }

          if (name.includes('pro')) {
            return {
              plan: 'Pro',
              limits: { testsPerDay: Infinity, questionCount: 20, attemptsPerTest: 2, explanationsPerMonth: 50 },
              usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
              remaining: { testsRemaining: Infinity, explanationsRemaining: 50 },
            } as any;
          }

          if (name.includes('tutor') || name.includes('teacher') || name.includes('tut')) {
            return {
              plan: 'Tutor',
              limits: { testsPerDay: Infinity, questionCount: 30, attemptsPerTest: Infinity, explanationsPerMonth: 1000 },
              usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
              remaining: { testsRemaining: Infinity, explanationsRemaining: 1000 },
            } as any;
          }

          return {
            plan: 'Free',
            limits: { testsPerDay: 1, questionCount: 10, attemptsPerTest: 1, explanationsPerMonth: 90 },
            usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
            remaining: { testsRemaining: 1, explanationsRemaining: 90 },
          } as any;
        })(planName);

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
        } as any;
      })(userData?.plan, adminSettings, usage);
      if (adminDerived) return adminDerived;
    }
    return null;
  })();

  const effectiveUsage = (function getEffectiveUsageInner(serverUsage: any | null, userPlan?: string | null) {
    const serverPlan = serverUsage?.plan ?? null;
    if (serverUsage && userPlan && serverPlan && serverPlan.toLowerCase() === String(userPlan).toLowerCase()) {
      return serverUsage;
    }
    if (userPlan) return (function defaultLimitsForPlanLocal(planName?: string | null) {
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
        } as any;
      }

      if (name.includes('pro')) {
        return {
          plan: 'Pro',
          limits: { testsPerDay: Infinity, questionCount: 20, attemptsPerTest: 2, explanationsPerMonth: 50 },
          usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
          remaining: { testsRemaining: Infinity, explanationsRemaining: 50 },
        } as any;
      }

      if (name.includes('tutor') || name.includes('teacher') || name.includes('tut')) {
        return {
          plan: 'Tutor',
          limits: { testsPerDay: Infinity, questionCount: 30, attemptsPerTest: Infinity, explanationsPerMonth: 1000 },
          usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
          remaining: { testsRemaining: Infinity, explanationsRemaining: 1000 },
        } as any;
      }

      return {
        plan: 'Free',
        limits: { testsPerDay: 1, questionCount: 10, attemptsPerTest: 1, explanationsPerMonth: 90 },
        usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
        remaining: { testsRemaining: 1, explanationsRemaining: 90 },
      } as any;
    })(userPlan);
    if (serverUsage) return serverUsage;
    return (function defaultLimitsForPlanLocal(planName?: string | null) {
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
        } as any;
      }

      if (name.includes('pro')) {
        return {
          plan: 'Pro',
          limits: { testsPerDay: Infinity, questionCount: 20, attemptsPerTest: 2, explanationsPerMonth: 50 },
          usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
          remaining: { testsRemaining: Infinity, explanationsRemaining: 50 },
        } as any;
      }

      if (name.includes('tutor') || name.includes('teacher') || name.includes('tut')) {
        return {
          plan: 'Tutor',
          limits: { testsPerDay: Infinity, questionCount: 30, attemptsPerTest: Infinity, explanationsPerMonth: 1000 },
          usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
          remaining: { testsRemaining: Infinity, explanationsRemaining: 1000 },
        } as any;
      }

      return {
        plan: 'Free',
        limits: { testsPerDay: 1, questionCount: 10, attemptsPerTest: 1, explanationsPerMonth: 90 },
        usage: { testsTodayDate: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
        remaining: { testsRemaining: 1, explanationsRemaining: 90 },
      } as any;
    })(null);
  })(serverOrAdminUsage, userData?.plan);

  const expiryDisplay = userData?.plan_expiry ? new Date(userData.plan_expiry).toLocaleString() : 'No expiry';
  const headerPlanLabel = (userData?.plan || effectiveUsage.plan || 'Free');
  const testAvailability = (function computeTestStatusLocal(effectiveUsageLocal: any | null) {
    const planName = effectiveUsageLocal?.plan ?? null;
    const planLimit = effectiveUsageLocal?.limits?.testsPerDay ?? null;
    const remaining = effectiveUsageLocal?.remaining?.testsRemaining ?? null;

    if (remaining === Infinity || planLimit === Infinity) return { status: 'A', remainingLabel: 'Unlimited' };
    if (typeof remaining === 'number' && remaining > 0) return { status: 'B', remainingLabel: String(remaining) };
    if (planName && /(pro|tutor|premium|enterprise)/i.test(String(planName))) return { status: 'A', remainingLabel: 'Unlimited' };
    if (typeof remaining === 'number' && remaining === 0) return { status: 'C', remainingLabel: '0' };
    if (typeof planLimit === 'number' && planLimit > 0) return { status: 'B', remainingLabel: String(planLimit) };
    return { status: 'C', remainingLabel: remaining == null ? '—' : String(remaining) };
  })(effectiveUsage);
  const canStartTest = testAvailability.status !== 'C';
  const isTutorPlan = String(effectiveUsage?.plan || '').toLowerCase() === 'tutor';

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Practice', href: '/practice' },
    { label: 'Progress', href: '/progress' },
    { label: 'Subscriptions', href: '/subscription' },
    { label: 'Account', href: '/profile' },
  ];

  return (
    <Box className={styles.container}>
      {/* Heading row stands alone */}
      <Grid container alignItems="flex-start" spacing={2}>
        <Grid item xs={12}>
          <Box className={styles.headingArea}>
            <Typography component="h1" className={styles.pageTitle}>
              Dashboard
            </Typography>
            <Typography className={styles.pageIntro}>
              Welcome back,&nbsp;
              <Box component="span" sx={{ fontWeight: 900, display: 'inline' }}>{displayName}</Box>.
              &nbsp;This is your hub for practice tests, progress tracking and account management.
            </Typography>
          </Box>
        </Grid>

        {/* Menu row (nav below heading) with actions aligned to the right.
            On compact screens the menu collapses into a drawer while actions remain visible. */}
        <Grid item xs={12}>
          <Box className={styles.navRow}>
            {/* Navigation area */}
            {!isCompact ? (
              <Box className={styles.navInner}>
                {navLinks.map((l) => {
                  const active = router.pathname === l.href || router.asPath.startsWith(l.href);
                  return (
                    <Button
                      key={l.href}
                      onClick={() => router.push(l.href)}
                      size="medium"
                      variant={active ? 'contained' : 'outlined'}
                      className={styles.navButton}
                    >
                      {l.label}
                    </Button>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton aria-label="Open menu" onClick={() => setNavCollapsed(true)}><MenuIcon /></IconButton>
                <Typography variant="body2" color="text.secondary">Menu</Typography>
              </Box>
            )}

            {/* Actions area */}
            <Box className={styles.actionsArea}>
              <Tooltip title={testAvailability.status === 'C' ? 'Blocked' : 'Start a new test'}>
                <span>
                  <Button
                    variant="contained"
                    color={testAvailability.status === 'A' ? 'success' : 'primary'}
                    size={isCompact ? 'small' : 'medium'}
                    onClick={openPicker}
                    sx={{ minWidth: isCompact ? 96 : 160, fontWeight: 700 }}
                    disabled={!canStartTest || starting}
                  >
                    {starting ? 'Starting…' : testAvailability.status === 'B' ? `Start test (${testAvailability.remainingLabel} left)` : 'Start practice'}
                  </Button>
                </span>
              </Tooltip>

              <Button variant="outlined" color="inherit" onClick={handleLogout} sx={{ ml: 1, minWidth: isCompact ? 72 : 110, textTransform: 'none' }}>
                Logout
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Main content grid (profile + tests) */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }} className={styles.profileCard}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>Profile</Typography>

            <Box sx={{ display: 'grid', gap: 1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary">User ID</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{/* resolveUserId unchanged: keep original implementation when applying */} {userData ? (userData.user_uid ?? userData.id ?? '-') : '-'}</Typography>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Full name</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{userData?.name || '-'}</Typography>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Email</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{userData?.email || '-'}</Typography>
                <Button size="small" variant="outlined" onClick={() => router.push('/profile')} sx={{ textTransform: 'none', ml: 'auto', borderRadius: 1 }}>Edit</Button>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Phone</Typography>
              <Typography variant="body2">{userData?.phone ?? '-'}</Typography>

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
                height: isMobile ? 'calc(100vh - 260px)' : 'calc(100vh - 210px)',
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
                    const taken = (function formatTakenAtLocal(value: any) {
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
                    })(t.takenAt ?? t.taken_at ?? t.taken ?? t.createdAt ?? t.created_at ?? t.takenOn ?? t.taken_on);
                    const progressStatus = (function deriveProgressStatusLocal(test: any): 'Not Started' | 'In Progress' | 'Completed' {
                      if (!test) return 'Not Started';
                      if (test.completed === true || test.status === 'completed' || test.status === 'done') return 'Completed';
                      if (typeof test.score === 'number' && test.score > 0) return 'Completed';
                      if (test.started === true || test.attempted === true || test.answersCount > 0 || test.questionsAnswered > 0) return 'In Progress';
                      if (test.takenAt || test.taken_at || test.updatedAt || test.updated_at) return 'In Progress';
                      return 'Not Started';
                    })(t);
                    const progressPercent = (function computeProgressPercentLocal(test: any): number | null {
                      if (!test) return null;
                      if (typeof test.progress === 'number') {
                        const p = Math.max(0, Math.min(100, test.progress));
                        return p;
                      }
                      const answered = Number(test.questionsAnswered ?? test.answersCount ?? 0);
                      const total = Number(test.questionCount ?? test.questions ?? test.totalQuestions ?? 0);
                      if (total > 0 && answered >= 0) {
                        return Math.round((Math.min(answered, total) / total) * 100);
                      }
                      return null;
                    })(t);
                    const href = `/review?id=${t.id}`;

                    return (
                      <React.Fragment key={key}>
                        <ListItem disablePadding>
                          <ListItemButton component={Link} href={href} sx={{ py: 1.25, px: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
                              <Typography variant="caption" color="text.secondary">Score: {score} • Taken: {taken}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                <Chip label={progressStatus} size="small" color={progressStatus === 'Completed' ? 'success' : progressStatus === 'In Progress' ? 'warning' : 'default'} />
                                {progressStatus === 'In Progress' && progressPercent != null && (
                                  <Box sx={{ flex: 1, ml: 1 }}>
                                    <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 2 }} />
                                  </Box>
                                )}
                              </Box>
                            </Box>

                            <Box sx={{ ml: 2, flexShrink: 0 }}>
                              <Button component={Link} href={href} size="small" variant="outlined" sx={{ textTransform: 'none' }}>Review</Button>
                            </Box>
                          </ListItemButton>
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

      {/* Nav drawer for collapsed mobile nav */}
      <Drawer anchor="left" open={navCollapsed} onClose={() => setNavCollapsed(false)}>
        <Box sx={{ width: 260, p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Menu</Typography>
              <IconButton size="small" onClick={() => setNavCollapsed(false)}><CloseIcon /></IconButton>
            </Stack>

            {navLinks.map((l) => (
              <Button key={l.href} fullWidth variant="outlined" onClick={() => { setNavCollapsed(false); router.push(l.href); }} sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>
                {l.label}
              </Button>
            ))}
          </Stack>
        </Box>
      </Drawer>

      {/* Filters drawer */}
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
              <select
                id="topic-filter-label"
                value={filterTopic}
                onChange={(e: any) => setFilterTopic(String(e.target.value))}
                style={{ width: '100%', padding: '8px', borderRadius: 4 }}
              >
                {topics.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
              </select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel id="score-filter-label">Score</InputLabel>
              <select
                id="score-filter-label"
                value={filterScore}
                onChange={(e: any) => setFilterScore(String(e.target.value))}
                style={{ width: '100%', padding: '8px', borderRadius: 4 }}
              >
                <option value="All">All</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3+">3+</option>
              </select>
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
          setPickerOpen(false);
        }}
        onStart={async (payload: any) => {
          try {
            if (!payload) return;
            setStarting(true);
            const body: any = { topic: payload.topic, difficulty: payload.difficulty };
            if (typeof payload.questionCount === 'number') body.questionCount = payload.questionCount;
            if (typeof payload.useExplanations === 'boolean') body.useExplanations = payload.useExplanations;
            const res = await axios.post('/api/tests/create-from-ai', body, { headers: { 'Content-Type': 'application/json' }, timeout: 120000 });
            const serverData = (res?.data ?? {}) as any;
            const sessionIdReturned = serverData?.sessionId ?? serverData?.id ?? null;
            try { if (typeof window !== 'undefined') sessionStorage.setItem('LAST_CREATED_TEST', JSON.stringify({ sessionId: sessionIdReturned, payload: serverData })); } catch {}
            if (sessionIdReturned) {
              await router.push({ pathname: '/test', query: { session: sessionIdReturned } });
            } else {
              await router.push({ pathname: '/test' });
            }
          } catch (err: any) {
            setSnack({ severity: 'error', message: 'Unable to start test. Try again later.' });
          } finally {
            setStarting(false);
            setPickerOpen(false);
          }
        }}
        maxQuestions={effectiveUsage?.limits?.questionCount ?? 10}
        explanationsAllowed={(effectiveUsage?.remaining?.explanationsRemaining ?? effectiveUsage?.limits?.explanationsPerMonth) !== 0}
      />

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
}