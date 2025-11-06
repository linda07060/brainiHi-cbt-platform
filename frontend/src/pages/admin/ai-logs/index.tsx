import React, { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Box, Typography, Paper, List, ListItem, ListItemText, Button } from '@mui/material';
import adminApi from '../../../lib/adminApi';

type AiLogSummary = {
  id: number;
  prompt: string;
  model?: string;
  success?: boolean;
  createdAt?: string;
};

type AiLogListResponse = {
  items: AiLogSummary[];
  page: number;
  totalPages: number;
  total?: number;
};

export default function AiLogsPage() {
  const [logs, setLogs] = useState<AiLogSummary[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLogs(p = 1) {
    setLoading(true);
    try {
      const params = { page: p, pageSize: 20 };
      // Tell axios/TypeScript what shape we expect back
      const res = await adminApi.get<AiLogListResponse>('/admin/ai-logs', { params });
      const data = res.data;
      // data may be undefined in some failure modes, guard with optional chaining
      setLogs(data?.items ?? []);
      setPage(data?.page ?? p);
      setTotalPages(data?.totalPages ?? 1);
    } catch (err) {
      console.error('Failed to load AI logs', err);
      setLogs([]);
      setPage(1);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout title="AI Logs">
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">AI Logs</Typography>
          <Button variant="outlined" onClick={() => fetchLogs(1)} disabled={loading}>
            Refresh
          </Button>
        </Box>

        {loading && <Typography>Loading...</Typography>}

        {!loading && logs.length === 0 && <Typography>No logs found</Typography>}

        {!loading && logs.length > 0 && (
          <List>
            {logs.map((l) => (
              <ListItem key={l.id} divider>
                <ListItemText
                  primary={l.prompt.length > 120 ? `${l.prompt.slice(0, 120)}…` : l.prompt}
                  secondary={`${l.model || 'N/A'} • ${l.success ? 'Success' : 'Failure'} • ${l.createdAt || ''}`}
                />
                <Button href={`/admin/ai-logs/${l.id}`} variant="text">
                  View
                </Button>
              </ListItem>
            ))}
          </List>
        )}

        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Button
            variant="contained"
            onClick={() => fetchLogs(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
          >
            Prev
          </Button>
          <Typography>
            Page {page} / {totalPages}
          </Typography>
          <Button
            variant="contained"
            onClick={() => fetchLogs(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </Box>
      </Paper>
    </AdminLayout>
  );
}