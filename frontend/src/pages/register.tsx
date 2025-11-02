import React, { useState } from 'react';
import { Box, Button, Container, TextField, Typography, Snackbar, Alert, MenuItem, Grid, InputLabel, Select, FormControl } from '@mui/material';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';
import styles from '../styles/Register.module.css';
import Spinner from '../components/Spinner';

const QUESTION_OPTIONS: { key: string; label: string }[] = [
  { key: 'mother_maiden', label: "What is your mother's maiden name?" },
  { key: 'first_school', label: 'What was the name of your first school?' },
  { key: 'first_car', label: 'What was the make of your first car?' },
  { key: 'favorite_teacher', label: 'Who was your favorite teacher?' },
  { key: 'best_friend', label: 'What is the first name of your best friend?' },
];

const PLANS = ['Free', 'Pro', 'Tutor'];

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryPassphrase, setRecoveryPassphrase] = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [plan, setPlan] = useState('Free');

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
        recoveryPassphrase,
        securityAnswers: [
          { questionKey: q1, answer: a1.trim() },
          { questionKey: q2, answer: a2.trim() },
          { questionKey: q3, answer: a3.trim() },
        ],
      };

      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, payload);
      // Expect: { access_token, user }
      const token = res.data?.access_token || res.data?.token || null;
      const user = res.data?.user || res.data;

      // Store auth (simple scheme)
      if (token) {
        const auth = { token, user };
        localStorage.setItem('auth', JSON.stringify(auth));
      } else if (user) {
        // fallback: some backends return full user and client must login; we redirect to login
        localStorage.removeItem('auth');
      }

      setSuccess(true);
      setMsg('Account created. Redirecting to dashboard…');
      setOpen(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1400);
    } catch (error: any) {
      setMsg(error?.response?.data?.message || 'Registration failed. Please try again.');
      setSuccess(false);
      setOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  // helper to avoid duplicate question selection
  const availableOptions = (excludeKey: string) =>
    QUESTION_OPTIONS.filter(q => q.key !== excludeKey);

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

          <TextField label="Recovery passphrase" required fullWidth type="password" value={recoveryPassphrase} onChange={e => setRecoveryPassphrase(e.target.value)} helperText="Keep this secret; used for account recovery" className={styles.field} />
          <TextField label="Confirm recovery passphrase" required fullWidth type="password" value={recoveryConfirm} onChange={e => setRecoveryConfirm(e.target.value)} className={styles.field} />

          <FormControl fullWidth size="small" className={styles.fieldSelect} sx={{ mt: 1 }}>
            <InputLabel id="plan-label">Select plan</InputLabel>
            <Select labelId="plan-label" label="Select plan" value={plan} onChange={(e) => setPlan(String(e.target.value))}>
              {PLANS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2, py: 1.5, fontWeight: '700' }} disabled={submitting} >
            {submitting ? <><Spinner /> Creating account…</> : 'Register'}
          </Button>

        </form>

        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Already have an account? <Link href="/login">Login</Link>
        </Typography>
      </Box>

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