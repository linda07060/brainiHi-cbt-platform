import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Snackbar,
  Alert,
  Grid,
  CircularProgress,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

/**
 * Profile editor page (phone + email + change password).
 * - Prefills email/phone from AuthContext user
 * - Allows updating email and phone (PATCH /auth/profile)
 * - Allows changing password (POST /auth/change-password)
 * - Updates AuthContext and localStorage after successful profile update
 */

const PROFILE_URL = `${process.env.NEXT_PUBLIC_API_URL}/auth/profile`;
const CHANGE_PASSWORD_URL = `${process.env.NEXT_PUBLIC_API_URL}/auth/change-password`;

/* --- Response shapes used on this page --- */
interface ProfileUpdateResponse {
  user?: any;
  message?: string;
  [k: string]: any;
}

interface ChangePasswordResponse {
  message?: string;
  [k: string]: any;
}

export default function ProfilePage(): JSX.Element {
  const { user, token: ctxToken, setUser } = useAuth() as any;

  const authAny = user as any;
  const token =
    (ctxToken as string) ||
    (authAny?.token ?? authAny?.access_token ?? authAny?.user?.token ?? authAny?.user?.access_token) ||
    null;

  const initialUser = (() => {
    if (!authAny) return null;
    if (authAny.user) return authAny.user;
    return authAny;
  })();

  const [email, setEmail] = useState<string>(initialUser?.email ?? '');
  const [phone, setPhone] = useState<string>(initialUser?.phone ?? '');

  // Email edit mode state
  const [editingEmail, setEditingEmail] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI state
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [snack, setSnack] = useState<{ severity: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Keep inputs in sync if auth changes externally
  useEffect(() => {
    const u = initialUser;
    setEmail(u?.email ?? '');
    setPhone(u?.phone ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (editingEmail && emailInputRef.current) {
      try {
        emailInputRef.current.focus();
        emailInputRef.current.select();
      } catch {}
    }
  }, [editingEmail]);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const validateEmail = (v: string) => /\S+@\S+\.\S+/.test(v);
  const validatePhone = (v: string) => {
    const cleaned = v.replace(/[^\d+]/g, '');
    return cleaned.length >= 6;
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSnack(null);

    if (!validateEmail(email)) {
      setSnack({ severity: 'info', message: 'Please enter a valid email address.' });
      return;
    }
    if (phone && !validatePhone(phone)) {
      setSnack({ severity: 'info', message: 'Please enter a valid phone number.' });
      return;
    }

    setSavingProfile(true);
    try {
      const body = { email: email.trim(), phone: phone.trim() };
      const res = await axios.patch(PROFILE_URL, body, { headers: { ...authHeaders } });

      // Cast response to ProfileUpdateResponse so TS knows .user may exist
      const data = (res?.data ?? {}) as ProfileUpdateResponse;
      const updatedUser = data.user ?? data ?? { ...initialUser, ...body };

      const newAuth = { token, user: updatedUser };
      try {
        if (typeof window !== 'undefined') localStorage.setItem('auth', JSON.stringify(newAuth));
      } catch {
        // ignore storage errors
      }
      setUser(newAuth as any);

      setSnack({ severity: 'success', message: 'Profile updated successfully.' });
      setEditingEmail(false);
    } catch (err: any) {
      const serverData = (err?.response?.data ?? {}) as ProfileUpdateResponse;
      const message = serverData.message || err?.response?.data?.error || 'Unable to update profile. Try again.';
      setSnack({ severity: 'error', message });
      // eslint-disable-next-line no-console
      console.error('Profile update error', err?.response ?? err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSnack(null);

    if (!oldPassword || !newPassword) {
      setSnack({ severity: 'info', message: 'Please provide both current and new password.' });
      return;
    }
    if (newPassword.length < 8) {
      setSnack({ severity: 'info', message: 'New password must be at least 8 characters.' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await axios.post(
        CHANGE_PASSWORD_URL,
        { oldPassword, newPassword },
        { headers: { ...authHeaders } },
      );

      const data = (res?.data ?? {}) as ChangePasswordResponse;

      setOldPassword('');
      setNewPassword('');
      setSnack({ severity: 'success', message: data.message ?? 'Password changed successfully.' });
    } catch (err: any) {
      const serverData = (err?.response?.data ?? {}) as ChangePasswordResponse;
      const message = serverData.message || err?.response?.data?.error || 'Failed to change password. Please check your current password.';
      setSnack({ severity: 'error', message });
      // eslint-disable-next-line no-console
      console.error('Change password error', err?.response ?? err);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', p: 2 }}>
      <Typography variant="h5" mb={2}>
        Profile
      </Typography>

      <Box component="form" onSubmit={handleSaveProfile} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!editingEmail ? (
              <>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{email}</Typography>
                </Box>
                <IconButton aria-label="edit email" onClick={() => setEditingEmail(true)} size="large">
                  <EditIcon />
                </IconButton>
              </>
            ) : (
              <Box sx={{ width: '100%', display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  inputRef={(el) => (emailInputRef.current = el)}
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                  disabled={savingProfile}
                />
                <IconButton aria-label="save email" color="primary" onClick={() => handleSaveProfile()} size="large">
                  <SaveIcon />
                </IconButton>
                <IconButton aria-label="cancel edit" onClick={() => { setEditingEmail(false); setEmail(initialUser?.email ?? ''); }} size="large">
                  <CloseIcon />
                </IconButton>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              disabled={savingProfile}
              helperText="Include country code if applicable"
            />
          </Grid>

          <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={savingProfile}
              startIcon={savingProfile ? <CircularProgress size={16} /> : undefined}
            >
              {savingProfile ? 'Saving…' : 'Save'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" mb={1}>Change password</Typography>
        <Box component="form" onSubmit={handleChangePassword} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Current password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                fullWidth
                disabled={changingPassword}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                disabled={changingPassword}
                helperText="Min 8 characters"
                required
              />
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={() => handleChangePassword()}
                disabled={changingPassword}
                startIcon={changingPassword ? <CircularProgress size={16} /> : undefined}
              >
                {changingPassword ? 'Changing…' : 'Change password'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {snack && (
        <Snackbar
          open
          autoHideDuration={4000}
          onClose={() => setSnack(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnack(null)} severity={snack.severity} sx={{ width: '100%' }}>
            {snack.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}