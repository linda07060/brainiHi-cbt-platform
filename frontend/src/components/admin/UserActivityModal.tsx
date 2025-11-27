import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import adminApi from '../../lib/adminApi';

type ActivityRow = {
  id?: number;
  user_id?: number;
  email?: string;
  ip?: string | null;
  user_agent?: string | null;
  created_at?: string;
};

export default function UserActivityModal({
  open,
  email,
  userId,
  onClose,
}: {
  open: boolean;
  email?: string | null;
  userId?: number | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only call API when modal is open and we have a numeric userId or a non-empty email
    if (!open || (typeof userId !== 'number' && (!email || email.trim() === ''))) {
      setRows([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchActivity = async () => {
      setLoading(true);
      setError(null);
      try {
        // Build payload: prefer numeric userId only and omit email if userId present.
        const payload: any = {};
        if (typeof userId === 'number') payload.user_id = Number(userId);
        else if (email && email.trim() !== '') payload.email = email.trim();

        if (Object.keys(payload).length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        // POST to new endpoint to avoid query validation issues
        const res = await adminApi.post<ActivityRow[] | { rows?: ActivityRow[] }>(
          '/admin/users/activity-post',
          payload,
        );

        const data = res.data as any;
        const resultRows: ActivityRow[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.rows) ? data.rows : []);

        if (!cancelled) setRows(resultRows);
      } catch (err: any) {
        console.error('[UserActivityModal] fetch error', err);
        let msg = 'Failed to load activity';
        if (err?.response) {
          const status = err.response.status;
          const data = err.response.data;
          msg = `Error ${status}: ${typeof data === 'string' ? data : (data?.message || JSON.stringify(data))}`;
        } else if (err?.message) {
          msg = err.message;
        }
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchActivity();
    return () => { cancelled = true; };
  }, [open, email, userId]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby="user-activity-title">
      <DialogTitle id="user-activity-title">Login activity — {email ?? (userId ? `user ${userId}` : '')}</DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && <Typography color="error">{error}</Typography>}

        {!loading && !error && rows.length === 0 && (
          <Typography color="text.secondary">No login activity found for this user.</Typography>
        )}

        {!loading && !error && rows.length > 0 && (
          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none' }}>
            <Table size="small" aria-label="user activity table">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell sx={{ width: '60%' }}>User agent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id ?? `${r.created_at}-${r.ip}`}>
                    <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</TableCell>
                    <TableCell>{r.ip ?? '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 520 }}>
                      {r.user_agent ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
}