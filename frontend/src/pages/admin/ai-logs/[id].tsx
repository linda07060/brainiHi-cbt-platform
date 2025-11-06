import React, { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Box, Typography, Button, Paper } from '@mui/material';
import adminApi from '../../../lib/adminApi';
import { useRouter } from 'next/router';

type AiLog = {
  id: number;
  prompt: string;
  response: any;
  model?: string;
  params?: any;
  success?: boolean;
  error?: string | null;
  createdAt?: string;
};

export default function AiLogDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [log, setLog] = useState<AiLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchLog = async () => {
      setLoading(true);
      try {
        // Tell axios what type we expect back so res.data is typed as AiLog
        const res = await adminApi.get<AiLog>(`/ai-logs/${id}`);
        setLog(res.data);
      } catch (err) {
        console.error('Failed to load AI log', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [id]);

  return (
    <AdminLayout title="AI Log">
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">AI Log Detail</Typography>
          <Button variant="outlined" onClick={() => router.back()}>Back</Button>
        </Box>

        {loading && <Typography>Loading...</Typography>}

        {!loading && !log && <Typography>No log found</Typography>}

        {log && (
          <Box>
            <Typography variant="subtitle1"><strong>Prompt:</strong></Typography>
            <Typography paragraph>{log.prompt}</Typography>

            <Typography variant="subtitle1"><strong>Response:</strong></Typography>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.response, null, 2)}</pre>

            <Typography variant="body2" color="text.secondary" mt={2}>
              Model: {log.model || 'N/A'} — Success: {String(log.success)}
            </Typography>

            {log.error && (
              <>
                <Typography variant="subtitle2" color="error" mt={2}>Error</Typography>
                <Typography>{log.error}</Typography>
              </>
            )}

            <Typography variant="caption" display="block" mt={2}>
              Created: {log.createdAt || 'N/A'}
            </Typography>
          </Box>
        )}
      </Paper>
    </AdminLayout>
  );
}