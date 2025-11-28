import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Snackbar,
  Alert,
  MenuItem,
  Grid,
  InputLabel,
  Select,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Register.module.css';
import Spinner from '../components/Spinner';

// AI transparency / legal components
import AITransparency from '../components/AITransparency';
import LegalDisclaimer from '../components/LegalDisclaimer';

const QUESTION_OPTIONS: { key: string; label: string }[] = [
  { key: 'mother_maiden', label: "What is your mother's maiden name?" },
  { key: 'first_school', label: 'What was the name of your first school?' },
  { key: 'first_car', label: 'What was the make of your first car?' },
  { key: 'favorite_teacher', label: 'Who was your favorite teacher?' },
  { key: 'best_friend', label: 'What is the first name of your best friend?' },
];

// Plans with structured pricing for monthly/yearly
const PLANS: {
  key: string;
  label: string;
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  caption?: string;
  recommended?: boolean;
}[] = [
  { key: 'Free', label: 'FREE', monthlyPrice: null, yearlyPrice: null, caption: 'Try Mode — Free' },
  { key: 'Pro', label: 'PRO', monthlyPrice: '$12.99', yearlyPrice: '$79.99', recommended: true },
  { key: 'Tutor', label: 'TUTOR', monthlyPrice: '$24.99', yearlyPrice: '$149.99' },
];

/**
 * Permissive server response shape for register endpoint.
 * Casting to this type before reading fields prevents TS errors like
 * "Property 'access_token' does not exist on type '{}'."
 */
interface RegisterResponse {
  access_token?: string;
  token?: string;
  accessToken?: string;
  user?: any;
  message?: string;
  [k: string]: any;
}

export default function Register() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPassphrase, setRecoveryPassphrase] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [plan, setPlan] = useState('Free');

  // Billing period toggle: 'monthly' or 'yearly'
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // security questions: we store 3 selections and answers
  const [q1, setQ1] = useState(QUESTION_OPTIONS[0].key);
  const [q2, setQ2] = useState(QUESTION_OPTIONS[1].key);
  const [q3, setQ3] = useState(QUESTION_OPTIONS[2].key);
  const [a1, setA1] = useState('');
  const [a2, setA2] = useState('');
  const [a3, setA3] = useState('');

  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Prefill email from query param (used by Google onboarding flow)
    if (router.isReady && router.query.email) {
      setEmail(String(router.query.email));
    }
  }, [router.isReady, router.query]);

  // Prefill plan from query param if present (case-insensitive)
  useEffect(() => {
    if (!router.isReady) return;
    const p = router.query.plan;
    if (!p) return;
    const planParam = String(p).toLowerCase();
    const found = PLANS.find((pl) => pl.key.toLowerCase() === planParam);
    if (found) {
      setPlan(found.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.plan]);

  function validateForm() {
    if (!name.trim()) return 'Full name is required';
    if (!email || !/\S+@\S+\.\S+/.test(email)) return 'Valid email is required';
    if (!phone || phone.trim().length < 6) return 'Please enter a valid phone number';
    if (!password || password.length < 8) return 'Password must be at least 8 characters';
    if (!recoveryPassphrase || recoveryPassphrase.length < 8) return 'Recovery passphrase must be at least 8 characters';
    if (recoveryPassphrase !== recoveryConfirm) return 'Recovery passphrase and confirmation do not match';
    // security answers
    const keys = [q1, q2, q3];
    const setKeys = new Set(keys);
    if (setKeys.size < 3) return 'Please choose three distinct security questions';
    if (!a1.trim() || !a2.trim() || !a3.trim()) return 'Please provide answers to all security questions';
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg('');
    const v = validateForm();
    if (v) {
      setMsg(v);
      setSuccess(false);
      setOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        plan,
        billingPeriod, // include billing preference so backend can show pricing context (server will still enforce)
        recoveryPassphrase,
        securityAnswers: [
          { questionKey: q1, answer: a1.trim() },
          { questionKey: q2, answer: a2.trim() },
          { questionKey: q3, answer: a3.trim() },
        ],
      };

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, payload);

      // Cast response to a permissive type so TypeScript knows optional fields may exist
      const data = (res?.data ?? {}) as RegisterResponse;

      // Expect either { access_token, user } or { token, user } or full user + token fields
      const token = data.access_token ?? data.token ?? data.accessToken ?? null;
      const user = data.user ?? data;

      // Store normalized auth { token, user } when possible and update context
      if (token || user) {
        const auth = { token, user };
        try {
          if (typeof window !== 'undefined') localStorage.setItem('auth', JSON.stringify(auth));
        } catch {
          // ignore storage errors
        }
        setUser(auth as any);
      } else {
        // No token returned: remove any stale auth and redirect to login
        try { if (typeof window !== 'undefined') localStorage.removeItem('auth'); } catch {}
      }

      setSuccess(true);
      setMsg('Account created. Redirecting to dashboard…');
      setOpen(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch (error: any) {
      // Be defensive reading server error message (cast before reading)
      const serverData = (error?.response?.data ?? {}) as RegisterResponse;
      setMsg(serverData.message || error?.response?.data?.message || 'Registration failed. Please try again.');
      setSuccess(false);
      setOpen(true);
      // eslint-disable-next-line no-console
      console.error('Registration error', error?.response || error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlan = PLANS.find(p => p.key === plan);

  const getPriceLabel = (p: typeof PLANS[number]) => {
    if (!p) return '';
    if (p.key === 'Free') return p.caption || 'Try Mode — Free';
    const price = billingPeriod === 'monthly' ? p.monthlyPrice : p.yearlyPrice;
    if (!price) return p.caption || '';
    return billingPeriod === 'monthly' ? `${price}/month` : `${price}/year`;
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Box className={styles.card}>
        <Typography variant="h4" fontWeight="700" className={styles.title}>Create an account</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Create your account and secure it with 3 security questions and a recovery passphrase.
        </Typography>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <TextField label="Full name" required fullWidth value={name} onChange={e => setName(e.target.value)} className={styles.field} />
          <TextField label="Email" required fullWidth type="email" value={email} onChange={e => setEmail(e.target.value)} className={styles.field} />
          <TextField label="Phone number" required fullWidth value={phone} onChange={e => setPhone(e.target.value)} className={styles.field} />

          <TextField label="Password" required fullWidth type="password" value={password} onChange={e => setPassword(e.target.value)} helperText="Min 8 characters" className={styles.field} />

          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography variant="subtitle2" mb={1}>Select three security questions</Typography>

            <Grid container spacing={1}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" className={styles.fieldSelect}>
                  <InputLabel id="q1-label">Question 1</InputLabel>
                  <Select labelId="q1-label" label="Question 1" value={q1} onChange={(e) => setQ1(String(e.target.value))}>
                    {QUESTION_OPTIONS.map(opt => <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" className={styles.fieldSelect}>
                  <InputLabel id="q2-label">Question 2</InputLabel>
                  <Select labelId="q2-label" label="Question 2" value={q2} onChange={(e) => setQ2(String(e.target.value))}>
                    {QUESTION_OPTIONS.map(opt => <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" className={styles.fieldSelect}>
                  <InputLabel id="q3-label">Question 3</InputLabel>
                  <Select labelId="q3-label" label="Question 3" value={q3} onChange={(e) => setQ3(String(e.target.value))}>
                    {QUESTION_OPTIONS.map(opt => <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField label="Answer to question 1" required fullWidth value={a1} onChange={e => setA1(e.target.value)} className={styles.field} sx={{ mt: 1 }} />
            <TextField label="Answer to question 2" required fullWidth value={a2} onChange={e => setA2(e.target.value)} className={styles.field} sx={{ mt: 1 }} />
            <TextField label="Answer to question 3" required fullWidth value={a3} onChange={e => setA3(e.target.value)} className={styles.field} sx={{ mt: 1 }} />
          </Box>

          <TextField label="Recovery passphrase" required fullWidth type="password" value={recoveryPassphrase} onChange={(e) => setRecoveryPassphrase(e.target.value)} helperText="Keep this secret; used for account recovery" className={styles.field} />
          <TextField label="Confirm recovery passphrase" required fullWidth type="password" value={recoveryConfirm} onChange={(e) => setRecoveryConfirm(e.target.value)} className={styles.field} />

          {/* Billing period toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
            <Typography variant="subtitle2">Billing</Typography>
            <ToggleButtonGroup
              value={billingPeriod}
              exclusive
              size="small"
              onChange={(_, value) => {
                if (value === null) return;
                setBillingPeriod(value);
              }}
              aria-label="billing period"
            >
              <ToggleButton value="monthly" aria-label="monthly billing">Monthly</ToggleButton>
              <ToggleButton value="yearly" aria-label="yearly billing">Yearly</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (selected applies to paid plans)
            </Typography>
          </Box>

          <FormControl fullWidth size="small" className={styles.fieldSelect} sx={{ mt: 2 }}>
            <InputLabel id="plan-label">Select plan</InputLabel>
            <Select labelId="plan-label" label="Select plan" value={plan} onChange={(e) => setPlan(String(e.target.value))}>
              {PLANS.map(p => (
                <MenuItem
                  key={p.key}
                  value={p.key}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 1,
                    ...(p.recommended ? {
                      border: '1px solid',
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(25,118,210,0.04)',
                    } : {}),
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ fontWeight: 700 }}>{p.label}</Typography>
                    {p.recommended && <Chip label="Recommended" color="primary" size="small" sx={{ ml: 1 }} />}
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {p.key === 'Free' ? (p.caption || 'Try Mode — Free') : getPriceLabel(p)}
                  </Typography>

                  {/* Show both prices for paid plans to provide context */}
                  {p.key !== 'Free' && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>
                      {p.monthlyPrice && p.yearlyPrice ? `${p.monthlyPrice}/month · ${p.yearlyPrice}/year` : ''}
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Select>

            {/* Display selected plan pricing/details under the dropdown */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedPlan ? (selectedPlan.key === 'Free' ? selectedPlan.caption : getPriceLabel(selectedPlan)) : ''}
            </Typography>
          </FormControl>

          {/* ---------- Paddle / Subscription transparency section ---------- */}
          <Box sx={{ mt: 2, mb: 1, p: 2, borderRadius: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            {selectedPlan && selectedPlan.key !== 'Free' ? (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Subscription details</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  This is an <strong>auto‑renewing</strong> subscription. Price: <strong>{getPriceLabel(selectedPlan)}</strong>.
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Cancellation: <strong>Cancel anytime</strong>. Cancelling prevents future renewals but does not automatically refund past periods — see our Refund Policy.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Payments are securely processed by Paddle. VAT/GST may apply based on your location.
                </Typography>
              </>
            ) : (
              <Typography variant="body2">Free plan — no recurring charges. You can upgrade anytime from your account.</Typography>
            )}
          </Box>

          {/* Terms + privacy acknowledgement required by Paddle (placed near the submit button) */}
          <Box sx={{ mt: 1, mb: 1, fontSize: 13, color: 'text.secondary' }}>
            By continuing, you agree to our{' '}
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms of Service</Link>{' '}
            and{' '}
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy Policy</Link>.
          </Box>

          <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2, py: 1.5, fontWeight: '700' }} disabled={submitting} >
            {submitting ? <><Spinner /> Creating account…</> : 'Register'}
          </Button>

        </form>

        {/* Support & help visibility (Paddle requirement) */}
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
          Need help? Contact: <a href="mailto:support@brainihi.com">support@brainihi.com</a>
        </Typography>

        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Already have an account? <Link href="/login">Login</Link>
        </Typography>
      </Box>

      {/* Transparency + legal blocks: show on auth pages so users see AI origin and disclaimer */}
      <AITransparency />
      <LegalDisclaimer />

      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        {success ? (
          <Alert severity="success" onClose={() => setOpen(false)} sx={{ width: '100%' }}>{msg || 'Registration successful'}</Alert>
        ) : (
          <Alert severity="error" onClose={() => setOpen(false)} sx={{ width: '100%' }}>{msg || 'Registration failed'}</Alert>
        )}
      </Snackbar>
    </Container>
  );
}