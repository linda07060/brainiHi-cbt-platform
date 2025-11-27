import React, { useEffect, useState, useRef } from 'react';
import { Box, Paper, Typography, Button, Stepper, Step, StepLabel, Snackbar, Alert } from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

type UserFlags = {
  require_security_setup?: boolean;
  require_passphrase_setup?: boolean;
};

const SESSION_ACTIVE_STEP_KEY = 'app.setup.activeStep';
const SESSION_TOTAL_REQUIRED_KEY = 'app.setup.totalRequired';
const SETUP_PRIORITY_KEY = 'app.setup.priority'; // optional config: 'passphrase' | 'security'

export default function SetupRequiredPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<UserFlags>({});
  const [activeStep, setActiveStep] = useState<number>(() => {
    try {
      const v = sessionStorage.getItem(SESSION_ACTIVE_STEP_KEY);
      return v ? Number(v) : 0;
    } catch {
      return 0;
    }
  });
  const [snackOpen, setSnackOpen] = useState(true);
  const [totalRequired, setTotalRequired] = useState<number>(() => {
    try {
      const v = sessionStorage.getItem(SESSION_TOTAL_REQUIRED_KEY);
      return v ? Number(v) : 0;
    } catch {
      return 0;
    }
  });

  const mountedRef = useRef(true);

  // Utility to read configured priority (optional). Default: passphrase first.
  const getPriority = () => {
    try {
      const p = localStorage.getItem(SETUP_PRIORITY_KEY);
      if (p === 'security') return 'security';
    } catch {}
    return 'passphrase';
  };

  // Fetch /auth/me and update flags; this also drives automatic advancement of steps.
  const fetchMe = async (opts?: { advancingFrom?: number }) => {
    try {
      const res = await axios.get<any>(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/auth/me`);
      const data: any = res?.data ?? {};

      // Only treat explicit require_* flags as requesting a specific setup step.
      const requirePassphrase = !!(data.require_passphrase_setup ?? data.requirePassphraseSetup ?? false);
      const requireSecurity = !!(data.require_security_setup ?? data.requireSecuritySetup ?? false);

      const newFlags = {
        require_security_setup: requireSecurity,
        require_passphrase_setup: requirePassphrase,
      };

      // Determine how many required steps there are.
      const requiredCount = (newFlags.require_passphrase_setup ? 1 : 0) + (newFlags.require_security_setup ? 1 : 0);

      // Persist totalRequired for progress header (always keep in sync).
      try {
        sessionStorage.setItem(SESSION_TOTAL_REQUIRED_KEY, String(requiredCount));
      } catch {}
      if (mountedRef.current) setTotalRequired(requiredCount);

      // If only one step is required, go directly to that setup page.
      if (requiredCount === 1) {
        try {
          sessionStorage.removeItem(SESSION_ACTIVE_STEP_KEY);
          sessionStorage.setItem(SESSION_TOTAL_REQUIRED_KEY, String(1));
        } catch {}
        if (newFlags.require_passphrase_setup) {
          router.replace('/setup-passphrase');
          return;
        }
        if (newFlags.require_security_setup) {
          router.replace('/setup-security');
          return;
        }
      }

      // For multi-step flows (requiredCount >= 2), keep the stepper UI and persist active step.
      if (mountedRef.current) {
        setFlags(newFlags);
        setLoading(false);
      }

      // Automatic advancement: if the current step has been completed (flag cleared), advance activeStep.
      // Build ordered steps based on configured priority.
      const priority = getPriority();
      const orderedSteps: string[] = [];
      if (priority === 'passphrase') {
        if (newFlags.require_passphrase_setup) orderedSteps.push('Set recovery passphrase');
        if (newFlags.require_security_setup) orderedSteps.push('Set security questions');
      } else {
        if (newFlags.require_security_setup) orderedSteps.push('Set security questions');
        if (newFlags.require_passphrase_setup) orderedSteps.push('Set recovery passphrase');
      }

      // If there are no steps (should redirect to dashboard)
      if (orderedSteps.length === 0) {
        try { sessionStorage.removeItem(SESSION_ACTIVE_STEP_KEY); } catch {}
        try { sessionStorage.removeItem(SESSION_TOTAL_REQUIRED_KEY); } catch {}
        router.replace('/dashboard');
        return;
      }

      const prevActive = activeStep;
      if (prevActive < orderedSteps.length) {
        const currentLabel = orderedSteps[prevActive];
        let stepCompleted = false;
        if (currentLabel && currentLabel.includes('passphrase')) {
          if (!newFlags.require_passphrase_setup) stepCompleted = true;
        } else if (currentLabel && currentLabel.includes('security')) {
          if (!newFlags.require_security_setup) stepCompleted = true;
        }
        if (stepCompleted) {
          const next = prevActive + 1;
          try { sessionStorage.setItem(SESSION_ACTIVE_STEP_KEY, String(next)); } catch {}
          if (mountedRef.current) setActiveStep(next);
        }
      }
    } catch (err) {
      // if not authenticated, push to login
      router.replace('/login');
    }
  };

  // initial fetch and set up polling + visibility/focus re-fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchMe();

    const interval = setInterval(() => {
      fetchMe();
    }, 3000);

    const onFocus = () => fetchMe();
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchMe();
    });

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build steps using configured priority; this order is used for navigation and for mapping step index -> flag.
  const buildSteps = (): string[] => {
    const priority = getPriority();
    const s: string[] = [];
    if (priority === 'passphrase') {
      if (flags.require_passphrase_setup) s.push('Set recovery passphrase');
      if (flags.require_security_setup) s.push('Set security questions');
    } else {
      if (flags.require_security_setup) s.push('Set security questions');
      if (flags.require_passphrase_setup) s.push('Set recovery passphrase');
    }
    return s;
  };

  if (loading) {
    return <Typography>Loading…</Typography>;
  }

  const steps = buildSteps();

  // If there are no required steps, redirect (safety)
  if (!steps || steps.length === 0) {
    router.replace('/dashboard');
    return null;
  }

  const currentStepLabel = steps[activeStep] ?? null;
  const currentRemaining = (flags.require_passphrase_setup ? 1 : 0) + (flags.require_security_setup ? 1 : 0);
  const completedCount = Math.max(0, (totalRequired || steps.length) - currentRemaining);

  const goToStep = (label: string) => {
    try { sessionStorage.setItem(SESSION_ACTIVE_STEP_KEY, String(activeStep)); } catch {}
    if (label.includes('passphrase')) router.push('/setup-passphrase');
    else router.push('/setup-security');
  };

  const handleNext = () => {
    if (!currentStepLabel) {
      router.push('/dashboard');
      return;
    }
    goToStep(currentStepLabel);
  };

  // Logout handler: clear client state and navigate to login.
  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/auth/logout`);
    } catch (err) {
      // ignore
    }
    try {
      localStorage.removeItem('auth');
      sessionStorage.removeItem(SESSION_ACTIVE_STEP_KEY);
      sessionStorage.removeItem(SESSION_TOTAL_REQUIRED_KEY);
    } catch (e) {
      // ignore
    }
    try {
      setUser?.(null);
    } catch {}
    router.replace('/login');
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Paper sx={{ width: 720, p: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>Additional setup required</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          An administrator has reset your account security. To continue, please complete the required steps below.
        </Typography>

        {/* Progress header */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {`${completedCount} of ${totalRequired || steps.length} required steps complete`}
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label} expanded>
              <StepLabel>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between', width: '100%' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {`Step ${index + 1} of ${steps.length}`}
                    </Typography>
                  </Box>
                </Box>
              </StepLabel>

              <Box sx={{ ml: 4, mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {label === 'Set recovery passphrase'
                    ? 'Create a new recovery passphrase to be used for account recovery.'
                    : 'Set or re-answer your security questions.'}
                </Typography>
                <Button variant="contained" onClick={() => goToStep(label)}>
                  Start
                </Button>
              </Box>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button onClick={handleNext} disabled={!currentStepLabel} variant="contained">
            {`Next — Step ${Math.min(activeStep + 1, steps.length)} of ${steps.length}`}
          </Button>

          <Button onClick={handleLogout} variant="outlined" color="inherit">
            Logout
          </Button>
        </Box>
      </Paper>

      <Snackbar open={snackOpen} autoHideDuration={7000} onClose={() => setSnackOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="info" onClose={() => setSnackOpen(false)}>
          An administrator has reset your account. You must complete the required steps before continuing to the dashboard.
        </Alert>
      </Snackbar>
    </Box>
  );
}