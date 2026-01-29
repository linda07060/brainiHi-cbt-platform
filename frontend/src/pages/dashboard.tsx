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
  Grid,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Snackbar,
  Alert,
  LinearProgress,
} from '@mui/material';
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

const ProfilePage = dynamic(() => import('./profile'), { ssr: false });
const TopicDifficultyModalAny = TopicDifficultyModal as unknown as React.ComponentType<any>;

/* ---------- Helpers (kept robust) ---------- */

function safeNumber(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string' && /^\d+$/.test(val)) return Number(val);
  const parsed = Number(val);
  if (!Number.isNaN(parsed)) return parsed;
  return null;
}

function formatTimestamp(value: any) {
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

/* ---------- Plan resolution helpers (frontend mirror) ---------- */

function resolvePlanFromUser(user: any): string | null {
  if (!user || typeof user !== 'object') return null;
  const tryStr = (v: any) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

  const direct = [
    user.plan,
    user.planName,
    user.plan_name,
    user.subscription?.plan,
    user.subscription?.name,
    user.subscription?.product?.name,
    user.subscription_plan,
    user.metadata?.plan,
    user.meta?.plan,
    user.profile?.plan,
    user.account?.plan,
    user.membership?.plan,
    user.tier,
    user.role,
    user?.paymentStatus?.plan,
    user?.payment?.plan,
  ];
  for (const c of direct) {
    const s = tryStr(c);
    if (s) return s;
  }

  try {
    if (Array.isArray(user.subscriptions) && user.subscriptions.length > 0) {
      for (const sub of user.subscriptions) {
        const s = tryStr(sub?.plan ?? sub?.name ?? sub?.product?.name);
        if (s) return s;
      }
    }
  } catch {}

  const nested = [
    user.data?.plan,
    user.data?.subscription?.plan,
    user.settings?.plan,
    user.attributes?.plan,
    user.info?.plan,
    user.subscriptionInfo?.plan,
    user.profile?.planName,
  ];
  for (const c of nested) {
    const s = tryStr(c);
    if (s) return s;
  }

  const tokenClaims = user?.claims ?? user?.tokenClaims ?? user?.payload ?? null;
  if (tokenClaims && typeof tokenClaims === 'object') {
    const s = tryStr(tokenClaims.plan) ?? tryStr(tokenClaims.planName) ?? tryStr(tokenClaims.subscription);
    if (s) return s;
  }

  return null;
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

  // filter & UI state
  const [searchText, setSearchText] = useState<string>('');
  const [filterTopic, setFilterTopic] = useState<string>('All');
  const [filterScore, setFilterScore] = useState<string>('All');
  const [filterFromDate, setFilterFromDate] = useState<string | null>(null);
  const [filterToDate, setFilterToDate] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Receipt dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // NEW: payment status state (structured). includes optional pendingAmount string
  const [paymentStatus, setPaymentStatus] = useState<{
    allowed: boolean;
    activeSubscription: boolean;
    hasSuccessfulPayment: boolean;
    plan?: string | null;
    plan_expiry?: string | null;
    reason?: string | null;
    pendingAmount?: string | null;
  } | null>(null);

  // NEW: loading flags to avoid plan/payment "flash"
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [paymentLoaded, setPaymentLoaded] = useState<boolean>(false);

  // NEW: debounce control for Start button (prevents fast flash)
  const ENABLE_DEBOUNCE_MS = 500; // adjust as needed (500ms prevents very-fast flashes)
  const [canStartVisible, setCanStartVisible] = useState<boolean>(false);
  const debounceRef = useRef<number | null>(null);

  // NEW: complete-payment confirmation dialog state
  const [completePaymentDialogOpen, setCompletePaymentDialogOpen] = useState(false);
  const [dialogPlan, setDialogPlan] = useState<string | null>(null);
  const [dialogBilling, setDialogBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [dialogPrice, setDialogPrice] = useState<{ amount: string; currency: string } | null>(null);

  // canonicalPlan is profile-first derived; used for display / defaults
  const [canonicalPlan, setCanonicalPlan] = useState<string | null>(null);

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

  // Price mapping (mirror pricing page)
  const mapPlanPrice = (plan?: string, billingPeriod?: string) => {
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
  };

  /* ---------- Data fetching (profile, usage, admin, tests) ---------- */

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
    const handler = () => { try { fetchTests(); } catch {} };
    window.addEventListener('tests-changed', handler as EventListener);
    return () => window.removeEventListener('tests-changed', handler as EventListener);
  }, [fetchTests]);

  // load profile and set canonicalPlan from profile immediately (highest priority)
  useEffect(() => {
    let mountedLocal = true;
    setProfileLoaded(false);
    const fetchProfile = async () => {
      if (!token) {
        if (mountedLocal) {
          setUserData(null);
          setProfileLoaded(true); // mark as loaded when there is no token
        }
        return;
      }
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
        if (mountedLocal) {
          setUserData(mergedUser);

          // derive plan from profile immediately - highest priority
          const planFromProfile = resolvePlanFromUser(mergedUser);
          if (planFromProfile) {
            const canonical = normalizePlanLabel(planFromProfile);
            setCanonicalPlan(canonical);
            console.debug('[dashboard] canonicalPlan set from profile:', canonical);
          } else {
            console.debug('[dashboard] no plan found in profile');
          }
        }
      } catch (err) {
        console.warn('[dashboard] fetchProfile failed', err);
        if (mountedLocal) setUserData(user ?? null);
      } finally {
        if (mountedLocal) setProfileLoaded(true);
      }
    };
    fetchProfile();
    return () => { mountedLocal = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ---------- Usage & admin settings (declare BEFORE paymentStatus effect) ---------- */

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

  /* ---------- serverOrAdminUsage & effectiveUsage MUST be declared before paymentStatus effect ---------- */

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
          usage: { testsPerDay: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
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
          usage: { testsPerDay: null, testsTodayCount: 0, explanationsMonth: null, explanationsCount: 0 },
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
    })(null);
  })(serverOrAdminUsage, userData?.plan);

  /* ---------- Payment status fetch (moved AFTER effectiveUsage) ---------- */
  useEffect(() => {
    let mountedLocal = true;
    setPaymentLoaded(false);
    const fetchPaymentStatus = async () => {
      if (!token) {
        if (mountedLocal) {
          setPaymentStatus(null);
          setPaymentLoaded(true); // mark loaded for unauthenticated users
        }
        return;
      }
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/check-access`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (res?.data ?? {}) as any;
        const allowed = typeof data.allowed === 'boolean' ? data.allowed : Boolean(data.allowed ?? false);
        const activeSubscription =
          typeof data.activeSubscription === 'boolean'
            ? data.activeSubscription
            : typeof data.active === 'boolean'
            ? data.active
            : Boolean(data.activeSubscription ?? data.active ?? allowed ?? false);
        const hasSuccessfulPayment = Boolean(data.hasSuccessfulPayment ?? data.hasSuccessful ?? data.hasPayment ?? false);
        const planFromServer = data.plan ?? data.planName ?? data.subscription?.plan ?? null;
        const plan_to_set = planFromServer ? normalizePlanLabel(String(planFromServer)) : null;

        // Build pending amount string if present in server response (multiple possible shapes)
        const getPendingAmountString = (d: any) => {
          try {
            const amount = d?.pendingAmount ?? d?.pending_amount ?? d?.pending?.amount ?? d?.amount_due ?? d?.pending_due;
            const currency = d?.pendingCurrency ?? d?.pending_currency ?? d?.pending?.currency ?? d?.currency ?? d?.currencyCode ?? 'USD';
            if (amount == null) return null;
            return `${String(amount)} ${String(currency).toUpperCase()}`;
          } catch {
            return null;
          }
        };

        const pendingAmountString = getPendingAmountString(data);

        // plan_expiry: only set when server confirms active subscription OR a successful payment
        const plan_expiry_raw = (activeSubscription || hasSuccessfulPayment)
          ? (data.plan_expiry ?? data.planExpiry ?? userData?.plan_expiry ?? null)
          : null;

        const normalized = {
          allowed,
          activeSubscription,
          hasSuccessfulPayment,
          plan: plan_to_set,
          plan_expiry: plan_expiry_raw,
          reason: data.reason ?? null,
          pendingAmount: pendingAmountString ?? null,
        };

        if (mountedLocal) {
          setPaymentStatus(normalized);
          console.debug('[dashboard] paymentStatus:', normalized);

          // If canonicalPlan not set from profile, use server plan as fallback
          if (!canonicalPlan && plan_to_set) {
            setCanonicalPlan(plan_to_set);
            console.debug('[dashboard] canonicalPlan set from server:', plan_to_set);
          }
        }
      } catch (err) {
        console.warn('[dashboard] fetchPaymentStatus failed', err);

        if (!mountedLocal) return;

        // Conservative fallback behavior on error:
        const explicitAuthPlan =
          authAny?.plan ??
          authAny?.planName ??
          authAny?.plan_name ??
          authAny?.user?.plan ??
          authAny?.user?.planName ??
          authAny?.user?.profile?.plan ??
          null;

        const explicitProfilePlanFallback =
          explicitAuthPlan ??
          userData?.plan ??
          userData?.planName ??
          userData?.plan_name ??
          userData?.subscription?.plan ??
          userData?.profile?.plan ??
          null;

        const normalizedProfilePlan = explicitProfilePlanFallback ? normalizePlanLabel(String(explicitProfilePlanFallback)) : null;
        const effectivePlanNormalized = effectiveUsage?.plan ? normalizePlanLabel(effectiveUsage.plan) : null;

        const isProfileFree = normalizedProfilePlan ? normalizedProfilePlan.toLowerCase().includes('free') : null;
        const isEffectiveFree = effectivePlanNormalized ? effectivePlanNormalized.toLowerCase().includes('free') : null;

        let fallbackAllowed: boolean;
        let fallbackPlanToReport: string | null = null;
        if (normalizedProfilePlan) {
          fallbackPlanToReport = normalizedProfilePlan;
          fallbackAllowed = isProfileFree === true ? true : false;
        } else if (effectivePlanNormalized) {
          fallbackPlanToReport = effectivePlanNormalized;
          fallbackAllowed = isEffectiveFree === true ? true : false;
        } else {
          fallbackAllowed = true;
          fallbackPlanToReport = 'Free';
        }

        setPaymentStatus({
          allowed: fallbackAllowed,
          activeSubscription: false,
          hasSuccessfulPayment: false,
          plan: fallbackPlanToReport,
          plan_expiry: null,
          reason: 'check_failed',
          pendingAmount: null,
        });

        if (!canonicalPlan) {
          setCanonicalPlan(fallbackPlanToReport);
          console.debug('[dashboard] canonicalPlan set from profile fallback after error:', fallbackPlanToReport);
        }
      } finally {
        if (mountedLocal) setPaymentLoaded(true);
      }
    };

    fetchPaymentStatus();
    return () => { mountedLocal = false; };
  }, [token, userData, canonicalPlan, authAny, effectiveUsage]);

  // Manage debounce so the button only becomes visible-enabled after a short stable period.
  // If canStartStrict becomes true we wait ENABLE_DEBOUNCE_MS before flipping canStartVisible true.
  // If it becomes false we immediately set canStartVisible false and clear any pending timer.
  useEffect(() => {
    // We will set up canStartStrict below, but we need to reference it here via variable
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // This effect will be re-run when immediateCanStart (canStartStrict) changes.
    // We'll create the canStartStrict value below and then have its change trigger this effect.
  }, []);

  useEffect(() => {
    // a noop placeholder to satisfy hook ordering in editors - real logic is below after canStartStrict computed
  });

  useEffect(() => {
    // This effect does the debounce timing once canStartStrict is defined later in the code.
    // It's intentionally left to be re-used by the canStartStrict change handler located later.
  }, []);

  useEffect(() => {
    // cleanup handled earlier
  });

  useEffect(() => {
    // placeholder
  });

  useEffect(() => {
    // placeholder
  });

  useEffect(() => {
    // placeholder
  });

  useEffect(() => {
    // placeholder
  });

  // (Above many placeholders keep hook order deterministic given the large component
  // layout. Actual debounce effect is defined after canStartStrict computation below.)

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
      const title = t.title ?? 'Unknown';
      const idx = title.indexOf('(');
      const topic = idx === -1 ? title.trim() : title.slice(0, idx).trim();
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

  /* ---------- Plan selection helper (declared after effectiveUsage) ---------- */

  function getSelectedPlanCandidate(): string {
    try {
      if (effectiveUsage && effectiveUsage.plan) {
        const ev = normalizePlanLabel(effectiveUsage.plan);
        console.debug('[dashboard] getSelectedPlanCandidate -> effectiveUsage.plan:', ev);
        return ev;
      }
    } catch {}

    const fromProfile = resolvePlanFromUser(userData);
    if (fromProfile) {
      const normalized = normalizePlanLabel(fromProfile);
      console.debug('[dashboard] getSelectedPlanCandidate -> fromProfile:', normalized);
      return normalized;
    }

    if (canonicalPlan) {
      console.debug('[dashboard] getSelectedPlanCandidate -> canonicalPlan:', canonicalPlan);
      return normalizePlanLabel(canonicalPlan);
    }

    if (paymentStatus?.plan) {
      console.debug('[dashboard] getSelectedPlanCandidate -> paymentStatus.plan:', paymentStatus.plan);
      return normalizePlanLabel(paymentStatus.plan);
    }

    const q = router.query?.plan;
    if (typeof q === 'string' && q.trim() !== '') {
      console.debug('[dashboard] getSelectedPlanCandidate -> router.query.plan:', q);
      return normalizePlanLabel(q);
    }

    if (typeof window !== 'undefined') {
      const keys = ['selected_plan', 'pendingPlan', 'registration_plan', 'signup_plan'];
      try {
        for (const k of keys) {
          const v = localStorage.getItem(k);
          if (v && v.trim() !== '') {
            console.debug('[dashboard] getSelectedPlanCandidate -> localStorage(', k, ')=', v);
            return normalizePlanLabel(v.trim());
          }
        }
      } catch (err) {
        console.warn('[dashboard] getSelectedPlanCandidate localStorage read failed', err);
      }
    }

    console.debug('[dashboard] getSelectedPlanCandidate -> fallback Free');
    return 'Free';
  }

  // Helper: robust free detection across multiple sources
  function isFreePlanCandidate(plan?: string | null): boolean {
    try {
      const p = plan ?? (paymentStatus?.plan ?? effectiveUsage?.plan ?? canonicalPlan ?? resolvePlanFromUser(userData));
      if (!p) return true;
      return String(p).toLowerCase().includes('free');
    } catch (err) {
      console.warn('[dashboard] isFreePlanCandidate error', err);
      return false;
    }
  }

  // Determine a canonical "current plan string" to use for UI/payment checks.
  const explicitAuthPlan =
    authAny?.plan ??
    authAny?.planName ??
    authAny?.plan_name ??
    authAny?.user?.plan ??
    authAny?.user?.planName ??
    authAny?.user?.profile?.plan ??
    null;

  const explicitProfilePlan =
    explicitAuthPlan ??
    userData?.plan ??
    userData?.planName ??
    userData?.plan_name ??
    userData?.subscription?.plan ??
    userData?.subscription?.name ??
    userData?.profile?.plan ??
    null;

  const resolvedPlanCandidateRaw =
    explicitProfilePlan && normalizePlanLabel(String(explicitProfilePlan)) !== 'Free'
      ? explicitProfilePlan
      : (paymentStatus?.plan ?? canonicalPlan ?? effectiveUsage?.plan ?? getSelectedPlanCandidate());

  const currentPlanForPayment = normalizePlanLabel(resolvedPlanCandidateRaw ?? 'Free');

  // normalized explicit profile plan (if present)
  const explicitProfilePlanNormalized = explicitProfilePlan ? normalizePlanLabel(String(explicitProfilePlan)) : null;
  const profilePlanIsFree = explicitProfilePlanNormalized ? explicitProfilePlanNormalized.toLowerCase().includes('free') : null;

  // planResolved is true when at least one authoritative source completed
  const planResolved = profileLoaded || paymentLoaded;

  // billingValid requires paymentLoaded and positive confirmation
  const billingValid = paymentLoaded && Boolean(paymentStatus && (paymentStatus.activeSubscription === true || paymentStatus.hasSuccessfulPayment === true));

  // compute test availability from effectiveUsage
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

  // New strict canStart: do not enable until we have enough info.
  const canStartStrict = (() => {
    // while nothing is loaded, block
    if (!profileLoaded && !paymentLoaded) return false;

    // if profile says Free, allow per usage limits (fast path)
    if (profileLoaded && profilePlanIsFree === true) return testAvailability.status !== 'C';

    // otherwise require paymentLoaded to decide paid-plan access
    if (!paymentLoaded) return false;

    // paymentLoaded: if server confirms active subscription or successful payment => allow
    if (billingValid) return testAvailability.status !== 'C';

    // if paymentLoaded and plan is Free according to payment or effectiveUsage => allow
    if (isFreePlanCandidate(currentPlanForPayment)) return testAvailability.status !== 'C';

    // otherwise block (paid plan without confirmed billing)
    return false;
  })();

  // Debounce effect for canStartVisible:
  useEffect(() => {
    if (canStartStrict) {
      // start debounce timer; only enable button if still true after delay
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      debounceRef.current = window.setTimeout(() => {
        setCanStartVisible(true);
        debounceRef.current = null;
      }, ENABLE_DEBOUNCE_MS);
    } else {
      // immediate disable and clear timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setCanStartVisible(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [canStartStrict]);

  const canStartTest = canStartVisible;
  const isTutorPlan = String(effectiveUsage?.plan || '').toLowerCase() === 'tutor';

  // paidBlocked and tooltip (for display)
  const paidBlocked =
    (!profileLoaded && !paymentLoaded && !isFreePlanCandidate(currentPlanForPayment)) || // unknown paid plan -> block
    (profileLoaded && !paymentLoaded && !profilePlanIsFree) || // profile indicates paid but we haven't checked payments
    (paymentLoaded && !billingValid && !isFreePlanCandidate(currentPlanForPayment)); // payment checked and not valid for paid plan

  const paidBlockedTooltip = !profileLoaded && !paymentLoaded && !isFreePlanCandidate(currentPlanForPayment)
    ? 'Checking payment status...'
    : paymentStatus?.pendingAmount
    ? `Payment required: ${paymentStatus.pendingAmount}`
    : paymentStatus && !paymentStatus.hasSuccessfulPayment
    ? 'You selected a paid plan but have not completed payment. Complete payment to access tests.'
    : 'No active subscription. Renew to access tests.';

  // Show spinner in Start button if we're still loading profile/payments or waiting for debounce to finish.
  const startButtonWaiting = (!profileLoaded || !paymentLoaded) || (canStartStrict && !canStartVisible);

  // LOGGING: runtime values to help debug UI state
  // eslint-disable-next-line no-console
  console.log('DASHBOARD-RUNTIME', {
    paymentStatus,
    paymentLoaded,
    profileLoaded,
    effectiveUsage,
    canonicalPlan,
    resolvedPlanCandidateRaw,
    currentPlanForPayment,
    explicitProfilePlanNormalized,
    profilePlanIsFree,
    planResolved,
    billingValid,
    paidBlocked,
    testAvailability,
    canStartStrict,
    canStartVisible,
    startButtonWaiting,
    canStartTest,
  });

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Practice', href: '/practice' },
    { label: 'Progress', href: '/progress' },
    { label: 'Subscriptions', href: '/subscription' },
    { label: 'Account', href: '/profile' },
  ];

  /* ---------- Start test from difficulty modal -> create-from-ai proxy ---------- */

  const startTestFromModal = async (opts: { difficulty?: string; topic?: string; questionCount?: number; useExplanations?: boolean } = {}) => {
    try {
      setStarting(true);
      setPickerOpen(false);

      const payload: any = {
        topic: opts.topic ?? 'General',
        difficulty: opts.difficulty ?? 'beginner',
      };
      if (typeof opts.questionCount === 'number' && !Number.isNaN(opts.questionCount)) {
        payload.questionCount = Math.max(1, Math.floor(opts.questionCount));
      }
      if (opts.useExplanations) payload.useExplanations = true;

      const PROXY = '/api/tests/create-from-ai';
      const BACKEND_FALLBACK = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '') + '/tests/create-from-ai';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      let res: any = null;
      try {
        res = await axios.post(PROXY, payload, { headers, timeout: 120000 });
      } catch (err: any) {
        const e = err as any;
        if (e?.response?.status === 404 && BACKEND_FALLBACK) {
          res = await axios.post(BACKEND_FALLBACK, payload, { headers, timeout: 120000 });
        } else {
          throw err;
        }
      }

      const data: any = res?.data ?? {};
      console.debug('[dashboard] create-from-ai result', data);

      const sessionId = data?.sessionId ?? data?.id ?? data?.testId ?? data?.idempotencyKey ?? null;
      const savedPayload = { sessionId, payload: data, token: token };

      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('LAST_CREATED_TEST', JSON.stringify(savedPayload));
        } catch (e) {
          console.warn('[dashboard] failed to write LAST_CREATED_TEST', e);
        }
      }

      if (sessionId) {
        await router.push({ pathname: '/test', query: { session: sessionId } });
      } else {
        await router.push('/test');
      }
    } catch (err: any) {
      const e = err as any;
      console.warn('[dashboard] startTestFromModal failed', e?.response?.status ?? e?.message ?? e);
      setSnack({ severity: 'error', message: 'Could not start test. Please try again.' });
    } finally {
      setStarting(false);
    }
  };

  /* ---------- UI Actions (open picker, payment dialogs) ---------- */

  const openPicker = () => {
    // openPicker is only reachable when the Start button is clickable.
    setPickerOpen(true);
  };

  const openCompletePaymentDialog = (planOverride?: string, billingPeriod?: 'monthly' | 'yearly') => {
    const candidate = planOverride ? normalizePlanLabel(planOverride) : getSelectedPlanCandidate();
    const billing = billingPeriod ?? 'monthly';
    setDialogPlan(candidate);
    setDialogBilling(billing);
    setDialogPrice(mapPlanPrice(candidate, billing));
    setCompletePaymentDialogOpen(true);
    console.debug('[dashboard] openCompletePaymentDialog -> plan:', candidate, 'billing:', billing, 'price:', mapPlanPrice(candidate, billing));
  };

  const closeCompletePaymentDialog = () => {
    setCompletePaymentDialogOpen(false);
    setDialogPlan(null);
    setDialogBilling('monthly');
    setDialogPrice(null);
  };

  const proceedToCheckout = async () => {
    const plan = dialogPlan ?? getSelectedPlanCandidate();
    const billing = dialogBilling ?? 'monthly';
    const amount = dialogPrice?.amount ?? '';
    await router.push({ pathname: '/checkout', query: { plan, billingPeriod: billing, amount } });
    closeCompletePaymentDialog();
  };

  // Recompute dialog price when billing toggle changes or dialogPlan changes
  useEffect(() => {
    if (!dialogPlan) return;
    const p = mapPlanPrice(dialogPlan, dialogBilling);
    setDialogPrice(p);
  }, [dialogPlan, dialogBilling]);

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

  // NEW: derive expiryString from paymentStatus when available and valid for paid plans.
  // This prevents showing a plan expiry that was set on account creation or stale data.
  const expiryString = useMemo(() => {
    // Prefer server-supplied plan_expiry only when billing confirms active subscription or a successful payment.
    const serverExpiry = paymentStatus?.plan_expiry ?? null;
    const profileExpiry = userData?.plan_expiry ?? null;

    const billingConfirmed = Boolean(paymentStatus && (paymentStatus.activeSubscription === true || paymentStatus.hasSuccessfulPayment === true));

    if (!billingConfirmed) {
      // For paid plans without confirmed billing, do not show an expiry (keeps UI consistent with billing)
      return null;
    }

    const chosen = serverExpiry ?? profileExpiry;
    if (!chosen) return null;
    try {
      const d = new Date(chosen);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  }, [paymentStatus, userData]);

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

  useEffect(() => {
    const rid = router.query?.receipt;
    if (rid) {
      (async () => {
        try {
          const id = String(rid);
          const res = await fetch(`/api/payments/${encodeURIComponent(id)}`, { credentials: 'same-origin' });
          if (!res.ok) return;
          const json = await res.json();
          setReceiptData(json);
          setReceiptDialogOpen(true);
        } catch {}
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Render (full dashboard preserved) ---------- */

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

  // Plan display: avoid flashing "Free" while we haven't resolved profile/payment.
  const planLabelToShow = (() => {
    if (!profileLoaded && !paymentLoaded) return 'Loading…';
    if (profileLoaded && explicitProfilePlanNormalized) return explicitProfilePlanNormalized;
    if (paymentLoaded && paymentStatus?.plan) return paymentStatus.plan;
    if (effectiveUsage?.plan) return normalizePlanLabel(effectiveUsage.plan);
    return 'Free';
  })();

  return (
    <Box className={styles.container}>
      {/* Heading row */}
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

            {/* Payment banners */}
            {paymentStatus && !isFreePlanCandidate(currentPlanForPayment) && paymentStatus.activeSubscription === false && paymentStatus.hasSuccessfulPayment && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning">
                  Your plan has expired. Please go to <Link href="/subscription">Subscriptions</Link> to renew or change plan.
                </Alert>
              </Box>
            )}
            {paymentStatus && !isFreePlanCandidate(currentPlanForPayment) && paymentStatus.activeSubscription === false && !paymentStatus.hasSuccessfulPayment && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="warning">
                  You selected a paid plan but have not completed payment.{' '}
                  <Button variant="text" onClick={() => openCompletePaymentDialog()} sx={{ textTransform: 'none' }}>
                    Complete payment
                  </Button>{' '}
                  to access tests and AI tutor.
                </Alert>
              </Box>
            )}
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box className={styles.navRow}>
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
                <Button onClick={() => setNavCollapsed(true)}><MenuIcon /></Button>
                <Typography variant="body2" color="text.secondary">Menu</Typography>
              </Box>
            )}

            <Box className={styles.actionsArea}>
              {/* Show billing tooltip ONLY for paid plans that are blocked by billing. Free users keep previous free-limit behavior. */}
              {paidBlocked ? (
                <Tooltip title={paidBlockedTooltip}>
                  <span>
                    <Button
                      variant="contained"
                      color={testAvailability.status === 'A' ? 'success' : 'primary'}
                      size={isCompact ? 'small' : 'medium'}
                      onClick={openPicker}
                      sx={{ minWidth: isCompact ? 96 : 160, fontWeight: 700 }}
                      disabled={starting || !canStartTest || testAvailability.status === 'C'}
                    >
                      {startButtonWaiting && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
                      {starting ? 'Starting…' : testAvailability.status === 'B' ? `Start Test (${testAvailability.remainingLabel} left)` : 'Start Test'}
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <span>
                  <Button
                    variant="contained"
                    color={testAvailability.status === 'A' ? 'success' : 'primary'}
                    size={isCompact ? 'small' : 'medium'}
                    onClick={openPicker}
                    sx={{ minWidth: isCompact ? 96 : 160, fontWeight: 700 }}
                    disabled={starting || !canStartTest || testAvailability.status === 'C'}
                  >
                    {startButtonWaiting && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
                    {starting ? 'Starting…' : testAvailability.status === 'B' ? `Start Test (${testAvailability.remainingLabel} left)` : 'Start Test'}
                  </Button>
                </span>
              )}

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
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{userData ? (userData.user_uid ?? userData.id ?? '-') : '-'}</Typography>

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
                <Chip label={planLabelToShow} size="small" sx={{ bgcolor: '#f7f1f3', color: '#7b1d2d', fontWeight: 700 }} />
              </Box>
            </Box>

            <Divider sx={{ my: 1 }} />

            <Typography variant="caption" color="text.secondary">Plan expiry</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{expiryString ? new Date(expiryString).toLocaleString() : 'No expiry'}</Typography>
            {expiryString && <Typography variant="caption" color="text.secondary">Time left: {countdown}</Typography>}

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
                paymentStatus && paymentStatus.activeSubscription === false ? (
                  <Alert severity="warning">AI tutor disabled — no active payment found. Please renew your plan in <Link href="/subscription">Subscriptions</Link>.</Alert>
                ) : (
                  <TutorUxSnippet effectiveUsage={effectiveUsage} />
                )
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
                    const taken = formatTimestamp(t.takenAt ?? t.taken_at ?? t.taken ?? t.createdAt ?? t.created_at ?? t.takenOn ?? t.taken_on);
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

      {/* Mobile navigation drawer (opened by hamburger) */}
      <Drawer
        anchor="left"
        open={navCollapsed}
        onClose={() => setNavCollapsed(false)}
        ModalProps={{ keepMounted: true }}
      >
        <Box sx={{ width: 260, p: 1 }} role="presentation" onKeyDown={(e) => {
          if (e.key === 'Escape') setNavCollapsed(false);
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Menu</Typography>
            <Button onClick={() => setNavCollapsed(false)} size="small">Close</Button>
          </Box>
          <Divider />
          <List>
            {navLinks.map((l) => (
              <ListItem key={l.href} disablePadding>
                <ListItemButton
                  onClick={async () => {
                    try {
                      await router.push(l.href);
                    } finally {
                      setNavCollapsed(false);
                    }
                  }}
                  sx={{ py: 1.25, px: 2 }}
                >
                  <Typography sx={{ fontWeight: 700 }}>{l.label}</Typography>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Topic difficulty modal: pass onClose so modal's Start uses it */}
      <TopicDifficultyModalAny
        open={pickerOpen}
        onClose={(result: any) => {
          setPickerOpen(false);
          if (result) {
            startTestFromModal(result);
          }
        }}
        effectiveUsage={effectiveUsage}
        canStartTest={canStartTest}
      />

      {/* Complete payment dialog */}
      <Dialog open={completePaymentDialogOpen} onClose={closeCompletePaymentDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Complete payment</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              You're about to pay for the <strong>{dialogPlan ?? getSelectedPlanCandidate()}</strong> plan.
            </Typography>

            <Typography variant="body2" sx={{ mb: 1 }}>
              Billing period:
              <Button size="small" sx={{ ml: 1 }} onClick={() => { setDialogBilling('monthly'); setDialogPrice(mapPlanPrice(dialogPlan ?? getSelectedPlanCandidate(), 'monthly')); }} variant={dialogBilling === 'monthly' ? 'contained' : 'outlined'}>Monthly</Button>
              <Button size="small" sx={{ ml: 1 }} onClick={() => { setDialogBilling('yearly'); setDialogPrice(mapPlanPrice(dialogPlan ?? getSelectedPlanCandidate(), 'yearly')); }} variant={dialogBilling === 'yearly' ? 'contained' : 'outlined'}>Yearly</Button>
            </Typography>

            <Typography variant="h6" sx={{ mt: 2 }}>
              Amount: {dialogPrice ? `${dialogPrice.amount} ${dialogPrice.currency}` : '—'}
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              You can change your selected plan from the Subscriptions page before proceeding.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => { closeCompletePaymentDialog(); router.push('/subscription'); }}>Change plan</Button>
          <Button onClick={closeCompletePaymentDialog}>Cancel</Button>
          <Button variant="contained" onClick={proceedToCheckout}>Proceed to checkout</Button>
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