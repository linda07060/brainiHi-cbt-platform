import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  /**
   * onConfirm may return a Promise. ConfirmDialog will show a loading spinner
   * while the returned Promise is pending. The caller remains responsible for
   * closing the dialog (calling onClose) so behaviour is unchanged.
   */
  onConfirm: () => Promise<any> | any;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  description,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (loading) return;
    try {
      setLoading(true);
      // Await the handler in case it returns a promise. Caller still controls closing.
      await Promise.resolve(onConfirm());
    } catch (err) {
      // Swallow here — callers show errors via Snackbar/status as before.
      // We keep the dialog open so the admin can retry/see the error.
      // Optionally you could bubble error handling here.
    } finally {
      setLoading(false);
    }
  };

  // Prevent closing while an action is in progress
  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      {title && <DialogTitle>{title}</DialogTitle>}
      <DialogContent>
        {description && <Typography variant="body1">{description}</Typography>}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleConfirm}
            disabled={loading}
            startIcon={loading ? <CircularProgress color="inherit" size={18} /> : undefined}
            sx={{ minWidth: 160 }}
          >
            {loading ? 'Processing…' : confirmLabel}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}