import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import UserActivityModal from './UserActivityModal';
import adminApi from '../../lib/adminApi';

type ActivityItem = {
  id?: string | number;
  type?: string;
  object_type?: string;
  object_id?: string | number | null;
  actor_email?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
  description?: string | null;
};

export default function RecentActivityCard({ initialStats }: { initialStats?: any }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any | null>(initialStats ?? null);
  const [rows, setRows] = useState<ActivityItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  // Activity modal state (opens UserActivityModal)
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityEmail, setActivityEmail] = useState<string | null>(null);
  const [activityUserId, setActivityUserId] = useState<number | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await adminApi.get<any>('/admin/stats');
      setStats(res.data);
      const r = res.data?.recentActivity ?? [];
      setRows(Array.isArray(r) ? r : []);
    } catch (err: any) {
      console.error('[RecentActivityCard] failed to fetch stats', err);
      setStatus('Failed to load recent activity');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
      setRows(initialStats.recentActivity ?? []);
      return;
    }
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStats]);

  const formatTime = (t?: string | null) => {
    if (!t) return '-';
    try {
      return new Date(t).toLocaleString();
    } catch {
      return String(t);
    }
  };

  const openActivityModal = (item: ActivityItem) => {
    setStatus(null);
    // Prefer actor_email; fallback to object_id when it looks like an email or the object_id is not numeric.
    const email = item?.actor_email ?? null;

    // If object_id is a number, pass it as numeric userId; otherwise undefined
    let uid: number | null = null;
    const rawObjId = item?.object_id != null ? String(item.object_id).trim() : '';
    if (/^[0-9]+$/.test(rawObjId)) {
      uid = Number(rawObjId);
    }

    setActivityEmail(email);
    setActivityUserId(uid);
    setActivityOpen(true);
  };

  const closeActivityModal = () => {
    setActivityOpen(false);
    setActivityEmail(null);
    setActivityUserId(null);
  };

  return (
    <>
      <Card variant="outlined" sx={{ height: '100%' }}>
        <CardHeader title="Recent activity" />
        <Divider />
        <CardContent>
          {stats?.recentActivitySource && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
              Activity source: {stats.recentActivitySource} ({stats.recentActivityCount ?? rows.length})
            </Typography>
          )}

          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={24} />
            </Box>
          )}

          {!loading && status && (
            <Typography variant="body2" color="error">{status}</Typography>
          )}

          {!loading && !status && rows.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No recent activity yet. If you expect events, ensure audit logging is enabled and users are signing in.
            </Typography>
          )}

          {!loading && rows.length > 0 && (
            <Box
              sx={{
                maxHeight: 320,
                overflowY: 'auto',
                pr: 1,
              }}
            >
              {rows.map((r) => (
                <Box key={r.id ?? `${r.created_at}-${r.actor_email}`} sx={{ py: 1, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {r.actor_email ?? r.description ?? '—'}{r.type === 'signup' ? ' signed up' : ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {r.actor_email ?? '—'}
                    {' '}
                    <span style={{ display: 'inline-block', marginLeft: 8, color: '#666' }}>{formatTime(r.created_at)}</span>
                  </Typography>
                  <Button size="small" variant="text" color="primary" onClick={() => openActivityModal(r)}>
                    View
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <UserActivityModal
        open={activityOpen}
        email={activityEmail ?? undefined}
        userId={activityUserId ?? undefined}
        onClose={closeActivityModal}
      />
    </>
  );
}