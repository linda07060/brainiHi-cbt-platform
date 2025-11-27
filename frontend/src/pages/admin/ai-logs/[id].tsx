import React, { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Box, Typography, Button, Paper, Switch, FormControlLabel } from '@mui/material';
import adminApi from '../../../lib/adminApi';
import { useRouter } from 'next/router';

type AiLog = {
  id: number;
  prompt: string;
  response: any;
  model?: string | null;
  params?: any;
  success?: boolean | null;
  error?: string | null;
  createdAt?: string | null;
};

type GeneratedQuestion = {
  question_id?: string;
  question_text?: string;
  question?: string;
  choices?: string[];
  correct_answer?: string;
  explanation?: string;
  difficulty?: string;
  topic?: string;
  estimated_time_seconds?: number;
};

export default function AiLogDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [log, setLog] = useState<AiLog | null>(null);
  const [parsedQuestion, setParsedQuestion] = useState<GeneratedQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchLog = async () => {
      setLoading(true);
      try {
        const res = await adminApi.get<{ log?: AiLog; parsedQuestion?: GeneratedQuestion } | AiLog>(`/admin/ai-logs/${id}`);
        const payload = res.data as any;

        const actualLog: AiLog = (payload && typeof payload === 'object' && 'log' in payload && payload.log) ? payload.log : (payload as AiLog);
        setLog(actualLog ?? null);

        setParsedQuestion((payload && typeof payload === 'object' && 'parsedQuestion' in payload) ? (payload.parsedQuestion ?? null) : null);
      } catch (err) {
        console.error('Failed to load AI log', err);
        setLog(null);
        setParsedQuestion(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [id]);

  const formatDate = (d?: string | Date | null) => {
    if (!d) return 'N/A';
    try {
      const t = typeof d === 'string' ? new Date(d) : new Date(d);
      return isNaN(t.getTime()) ? String(d) : t.toISOString();
    } catch {
      return String(d);
    }
  };

  const formatResponseForDisplay = (r: any) => {
    if (r === null || typeof r === 'undefined') return '-';
    if (typeof r === 'object') return JSON.stringify(r, null, 2);

    let s = String(r);
    const outerQuoteMatch = s.match(/^"([\s\S]*)"$/);
    if (outerQuoteMatch) {
      s = outerQuoteMatch[1];
    }

    try {
      const parsed = JSON.parse(s);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // not JSON
    }

    s = s.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    s = s.replace(/\n{3,}/g, '\n\n');
    return s.trim();
  };

  // Helper to download a single log CSV via backend /admin/ai-logs/:id/export
  async function exportOneCsv() {
    if (!id) return;
    try {
      const res = await adminApi.get(`/admin/ai-logs/${id}/export`, { responseType: 'blob' });
      const contentDisposition = res.headers?.['content-disposition'] || res.headers?.['Content-Disposition'];
      let filename = `ai-log-${id}.csv`;
      if (contentDisposition) {
        const match = String(contentDisposition).match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export single AI log CSV', err);
      alert('Export failed. Check server logs or permissions.');
    }
  };

  return (
    <AdminLayout title="AI Log">
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">AI Log Detail</Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <FormControlLabel
              control={<Switch checked={showRaw} onChange={() => setShowRaw((v) => !v)} />}
              label="Show raw"
            />
            <Button variant="outlined" onClick={() => router.back()}>Back</Button>
            <Button variant="contained" color="primary" onClick={exportOneCsv}>Export CSV</Button>
          </Box>
        </Box>

        {loading && <Typography>Loading...</Typography>}

        {!loading && !log && <Typography>No log found</Typography>}

        {log && (
          <Box>
            <Typography variant="subtitle1"><strong>Prompt:</strong></Typography>
            <Typography paragraph>{log.prompt || '-'}</Typography>

            <Typography variant="subtitle1"><strong>Response:</strong></Typography>

            <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 12, borderRadius: 4 }}>
              {showRaw ? (typeof log.response === 'string' ? log.response : JSON.stringify(log.response, null, 2))
                : formatResponseForDisplay(log.response)}
            </pre>

            <Typography variant="body2" color="text.secondary" mt={2}>
              Model: {log.model ?? 'N/A'} — Success: {typeof log.success === 'boolean' ? String(log.success) : (log.success ?? 'N/A')}
            </Typography>

            {log.error && (
              <>
                <Typography variant="subtitle2" color="error" mt={2}>Error</Typography>
                <Typography>{log.error}</Typography>
              </>
            )}

            {parsedQuestion && (
              <>
                <Box mt={2}>
                  <Typography variant="subtitle1"><strong>Parsed Question (first candidate):</strong></Typography>
                  <Typography>{parsedQuestion.question_text ?? parsedQuestion.question ?? '-'}</Typography>
                  <Typography variant="caption" display="block" mt={1}>
                    ID: {parsedQuestion.question_id ?? 'N/A'} • Difficulty: {parsedQuestion.difficulty ?? 'N/A'} • Topic: {parsedQuestion.topic ?? 'N/A'}
                  </Typography>
                  <Typography variant="subtitle2" mt={1}><strong>Choices:</strong></Typography>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(parsedQuestion.choices ?? [], null, 2)}</pre>
                  {parsedQuestion.explanation && (
                    <>
                      <Typography variant="subtitle2" mt={1}><strong>Explanation:</strong></Typography>
                      <Typography paragraph>{parsedQuestion.explanation}</Typography>
                    </>
                  )}
                </Box>
              </>
            )}

            {/* Footer removed for admin pages */}
          </Box>
        )}
      </Paper>
    </AdminLayout>
  );
}