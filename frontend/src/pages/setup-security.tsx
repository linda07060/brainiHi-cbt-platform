import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import Header from '../components/Header';
import Preloader from '../components/Preloader';
import layout from '../styles/Layout.module.css';
import { useAuth } from '../context/AuthContext';

type QA = {
  questionKey: string;
  questionLabel: string;
  answer: string;
};

const DEFAULT_QUESTIONS: Array<{ key: string; label: string }> = [
  { key: 'mother_maiden', label: "What is your mother's maiden name?" },
  { key: 'first_school', label: 'What was the name of your first school?' },
  { key: 'first_pet', label: 'What was the name of your first pet?' },
  { key: 'favorite_teacher', label: 'What is the full name of your favorite teacher?' },
  { key: 'birth_city', label: 'In which city were you born?' },
  { key: 'favorite_color', label: 'What is your favorite color?' },
];

const SESSION_ACTIVE_STEP_KEY = 'app.setup.activeStep';
const SESSION_TOTAL_REQUIRED_KEY = 'app.setup.totalRequired';

export default function SetupSecurity(): JSX.Element {
  const router = useRouter();
  const { setUser } = useAuth(); // <-- update app auth state after successful setup
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Initialize exactly 3 answer slots (user answers 3 questions).
  const initialQas: QA[] = [
    { questionKey: DEFAULT_QUESTIONS[0].key, questionLabel: DEFAULT_QUESTIONS[0].label, answer: '' },
    { questionKey: DEFAULT_QUESTIONS[1].key, questionLabel: DEFAULT_QUESTIONS[1].label, answer: '' },
    { questionKey: DEFAULT_QUESTIONS[2].key, questionLabel: DEFAULT_QUESTIONS[2].label, answer: '' },
  ];

  const [qas, setQas] = useState<QA[]>(initialQas);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('info');

  // admin notice state (tiny notification at top)
  const [adminNoticeOpen, setAdminNoticeOpen] = useState(true);

  // Fetch /auth/me to confirm the user is required to set security; otherwise redirect away.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get<any>(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/auth/me`);
        if (!mounted) return;
        const data: any = res?.data ?? {};

        // NOTE: we only treat explicit require_security_setup (or camelCase variant) as indicating the
        // user must complete the security setup. We removed the previous check that forced this page
        // whenever securityConfigured was false to avoid redirecting users who only had passphrase reset.
        const requireSecurity =
          !!(data.require_security_setup ?? data.requireSecuritySetup ?? false);

        if (!requireSecurity) {
          router.replace('/dashboard');
          return;
        }
      } catch (err) {
        router.replace('/login');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const handleAnswerChange = (idx: number, val: string) => {
    setQas((prev) => {
      const copy = prev.map((p) => ({ ...p }));
      copy[idx].answer = val;
      return copy;
    });
  };

  const handleQuestionChange = (idx: number, key: string) => {
    const qDef = DEFAULT_QUESTIONS.find((d) => d.key === key);
    setQas((prev) => {
      const copy = prev.map((p) => ({ ...p }));
      copy[idx].questionKey = key;
      copy[idx].questionLabel = qDef ? qDef.label : key;
      return copy;
    });
  };

  const validateAnswers = (): string | null => {
    for (let i = 0; i < qas.length; i++) {
      if (!qas[i].answer || qas[i].answer.trim().length < 1) {
        return `Please provide an answer for: ${qas[i].questionLabel}`;
      }
      if (qas[i].answer.trim().length < 2) {
        return `Answer for "${qas[i].questionLabel}" is too short`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const vErr = validateAnswers();
    if (vErr) {
      setSnackMsg(vErr);
      setSnackSeverity('error');
      setSnackOpen(true);
      return;
    }

    setSubmitting(true);
    setSnackOpen(false);

    try {
      const payload = {
        securityAnswers: qas.map((q) => ({ questionKey: q.questionKey, answer: q.answer.trim() })),
      };

      const res = await axios.post<any>(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/auth/setup-security`,
        payload
      );

      const data: any = res?.data ?? {};
      setSnackMsg(data.message ?? 'Security questions saved');
      setSnackSeverity('success');
      setSnackOpen(true);

      // Prefer to refresh authoritative user from the server after setup.
      let authoritativeUser: any = data.user ?? data;
      try {
        const meRes = await axios.get<any>(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/auth/me`);
        authoritativeUser = meRes?.data ?? authoritativeUser;
      } catch (meErr) {
        // If /auth/me fails, fall back to returned user (no-op)
        // eslint-disable-next-line no-console
        console.warn('Failed to refresh /auth/me after setup-security', meErr);
      }

      try {
        // read existing token from localStorage and update stored auth object
        const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
        const current = raw ? JSON.parse(raw) : null;
        const token = current?.token ?? current?.access_token ?? current?.accessToken ?? null;
        const newAuth = token ? { token, user: authoritativeUser } : { token: null, user: authoritativeUser };
        try {
          if (typeof window !== 'undefined') localStorage.setItem('auth', JSON.stringify(newAuth));
        } catch {}
        // update context so other components respond immediately
        try { setUser(newAuth); } catch {}
      } catch {
        // ignore storage/context errors
      }

      // next step
      const requirePassphrase = !!(authoritativeUser?.require_passphrase_setup ?? authoritativeUser?.requirePassphraseSetup ?? false);
      // Keep sessionStorage counters in sync and set active step if navigating
      try {
        const needPass = requirePassphrase;
        const needSecurity = !!(authoritativeUser?.require_security_setup ?? authoritativeUser?.requireSecuritySetup ?? false);
        const totalRequired = (needPass ? 1 : 0) + (needSecurity ? 1 : 0);
        try { sessionStorage.setItem(SESSION_TOTAL_REQUIRED_KEY, String(totalRequired)); } catch {}
        if (needPass) {
          try { sessionStorage.setItem(SESSION_ACTIVE_STEP_KEY, String(0)); } catch {}
        } else {
          try { sessionStorage.removeItem(SESSION_ACTIVE_STEP_KEY); sessionStorage.removeItem(SESSION_TOTAL_REQUIRED_KEY); } catch {}
        }
      } catch {}

      setTimeout(() => {
        if (requirePassphrase) router.push('/setup-passphrase');
        else router.push('/dashboard');
      }, 900);
    } catch (err: any) {
      const msg = (err?.response?.data?.message) ?? (err?.message) ?? 'Failed to save security answers';
      setSnackMsg(String(msg));
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Logout handler: clear client state and navigate to login.
  // We intentionally do NOT change server-side require_* flags so the user will still be forced into setup on next login.
  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/auth/logout`);
    } catch (err) {
      // ignore
    }
    try {
      localStorage.removeItem('auth');
      sessionStorage.removeItem('app.setup.activeStep');
      sessionStorage.removeItem('app.setup.totalRequired');
    } catch (e) {
      // ignore
    }
    try {
      setUser?.(null);
    } catch {}
    router.replace('/login');
  };

  if (loading) {
    return (
      <>
        <Header />
        <Preloader />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <Header />

      {adminNoticeOpen && (
        <Box sx={{ maxWidth: 800, margin: '12px auto 0', px: 2 }}>
          <Alert
            severity="info"
            onClose={() => setAdminNoticeOpen(false)}
            sx={{ fontSize: '0.95rem', py: 1 }}
          >
            An administrator reset your security questions (per your request). Please set new security answers to continue.
          </Alert>
        </Box>
      )}

      <main className={layout.contentInner} style={{ padding: '40px 20px' }}>
        <Paper sx={{ maxWidth: 800, margin: '0 auto', p: 4 }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Set security questions
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
            For account recovery, please provide answers to three security questions. You can choose any question from the
            list of options for each slot.
          </Typography>

          <Box component="form" noValidate autoComplete="off" sx={{ display: 'grid', gap: 2 }}>
            {qas.map((q, idx) => (
              <Box key={q.questionKey + '-' + idx} sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="caption">Question {idx + 1}</Typography>
                <TextField
                  select
                  value={q.questionKey}
                  onChange={(e) => handleQuestionChange(idx, e.target.value as string)}
                >
                  {DEFAULT_QUESTIONS.map((opt) => (
                    <MenuItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label={`Answer for "${q.questionLabel}"`}
                  value={q.answer}
                  onChange={(e) => handleAnswerChange(idx, e.target.value)}
                  fullWidth
                  required
                />
              </Box>
            ))}

            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="contained" color="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save security answers'}
              </Button>

              <Button variant="outlined" color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          </Box>
        </Paper>

        <Snackbar
          open={snackOpen}
          autoHideDuration={4000}
          onClose={() => setSnackOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={snackSeverity} onClose={() => setSnackOpen(false)} sx={{ width: '100%' }}>
            {snackMsg}
          </Alert>
        </Snackbar>
      </main>
    </>
  );
}