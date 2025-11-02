import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField, Box } from '@mui/material';
import ConfirmDialog from './ConfirmDialog';
import api from '../../lib/adminApi';

type Props = {
  open: boolean;
  onClose: () => void;
  userId: number | string | null;
  userData?: any;
  onUpdated?: (u: any) => void;
};

export default function UserDetailModal({ open, onClose, userId, userData, onUpdated }: Props) {
  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  if (!userId || !userData) {
    return null;
  }

  const handleResetPassword = async () => {
    setSaving(true);
    setStatus(null);
    try {
      // API: POST /admin/users/:id/reset-password { newPassword } or returns generated token
      const res = await api.post(`/admin/users/${userId}/reset-password`, { newPassword });
      setStatus(res.data?.message || 'Password reset');
      if (onUpdated) onUpdated(res.data?.user || userData);
    } catch (err: any) {
      setStatus(err?.response?.data?.message || 'Unable to reset password');
    } finally {
      setSaving(false);
      setShowResetConfirm(false);
    }
  };

  const handleForceResetSecurity = async () => {
    setSaving(true);
    setStatus(null);
    try {
      // API: POST /admin/users/:id/reset-security (backend decides action)
      const res = await api.post(`/admin/users/${userId}/reset-security`, {});
      setStatus(res.data?.message || 'Security reset');
      if (onUpdated) onUpdated(res.data?.user || userData);
    } catch (err: any) {
      setStatus(err?.response?.data?.message || 'Unable to reset security data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>User details</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="caption">User ID</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>{userData.user_uid || userData.id}</Typography>

            <Typography variant="caption">Full name</Typography>
            <Typography variant="body1">{userData.name}</Typography>

            <Typography variant="caption">Email</Typography>
            <Typography variant="body1">{userData.email}</Typography>

            <Typography variant="caption">Phone</Typography>
            <Typography variant="body1">{userData.phone || '-'}</Typography>

            <Typography variant="caption">Plan</Typography>
            <Typography variant="body1">{userData.plan}</Typography>

            <Typography variant="caption">Security questions</Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              {/* Only show question keys/labels (do not expose answers) */}
              {userData.securityQuestions ? userData.securityQuestions.join(', ') : 'Configured'}
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Admin: Reset user password</Typography>
              <TextField
                label="New password (leave empty to generate)"
                type="password"
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                If you leave the field empty, the server may generate a temporary token which you can copy and share securely with the user.
              </Typography>
            </Box>
          </Box>

          {status && <Typography variant="body2" color="error" sx={{ mt: 2 }}>{status}</Typography>}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button variant="outlined" color="warning" onClick={handleForceResetSecurity} disabled={saving}>Reset security</Button>
          <Button variant="contained" color="primary" onClick={() => setShowResetConfirm(true)} disabled={saving}>
            Reset password
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={showResetConfirm}
        title="Confirm password reset"
        description="Are you sure you want to reset this user's password? This action will update their password or generate a temporary token."
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetPassword}
        confirmLabel="Yes, reset"
      />
    </>
  );
}