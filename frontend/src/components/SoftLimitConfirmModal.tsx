import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function SoftLimitConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirm potential overage',
  message = 'You are about to exceed your Tutor plan explanations soft limit. This may incur additional usage. Do you want to proceed?',
  confirmLabel = 'Proceed',
  cancelLabel = 'Cancel',
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="soft-limit-title">
      <DialogTitle id="soft-limit-title">{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">{message}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          You can disable AI explanations to avoid using your quota.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{cancelLabel}</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}