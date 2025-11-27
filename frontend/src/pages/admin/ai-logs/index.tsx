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
      const params: any = { page: p, limit: 20, _t: Date.now() };
      const res = await adminApi.get<AiLogListResponse>('/admin/ai-logs', { params });
      const data = res.data;
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

  // Download helper: take a blob and filename, trigger browser download
  function downloadBlob(filename: string, blob: Blob) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  // Export list CSV using current filters (page/limit are passed, backend pages through)
  async function exportCsv() {
    try {
      // You can add filters here if you add filter UI later (userId/model/success)
      const params: any = { page: page ?? 1, limit: 5000, _t: Date.now() }; // large limit to attempt full export
      const res = await adminApi.get('/admin/ai-logs/export', { params, responseType: 'blob' });
      const contentDisposition = res.headers?.['content-disposition'] || res.headers?.['Content-Disposition'];
      let filename = 'ai-logs.csv';
      if (contentDisposition) {
        // attempt to parse filename= from header
        const match = String(contentDisposition).match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      downloadBlob(filename, res.data as Blob);
    } catch (err) {
      console.error('Failed to export AI logs CSV', err);
      // Optionally show a UI toast here
      alert('Export failed. Check server logs or CORS settings.');
    }
  }

  return (
    <AdminLayout title="AI Logs">
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">AI Logs</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => fetchLogs(1)} disabled={loading}>
              Refresh
            </Button>
            <Button variant="contained" color="primary" onClick={exportCsv} disabled={loading}>
              Export CSV
            </Button>
          </Box>
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

        {/* Footer intentionally removed for admin pages */}
      </Paper>
    </AdminLayout>
  );
}