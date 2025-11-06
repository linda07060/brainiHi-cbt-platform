import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
  Stack,
  Chip,
  Button,
} from '@mui/material';
import { CheckCircleOutline, CancelOutlined, ExpandMore, ArrowBack } from '@mui/icons-material';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

interface Explanation {
  id: number | string;
  question: string;
  yourAnswer?: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  explanation?: string | null;
}

interface ReviewResponse {
  questions?: Explanation[] | any[];
  score?: number;
  [k: string]: any;
}

export default function ReviewPage(): JSX.Element {
  const router = useRouter();
  const { query } = router;
  const { user, token } = useAuth();

  // Prevent SSR / hydration mismatch by rendering auth-dependent UI only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [details, setDetails] = useState<Explanation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    // Only fetch on client after mount to avoid hydration mismatch
    if (!mounted) return;
    if ((!user && !token) || !query.id) return;

    let cancelled = false;
    const fetchReview = async () => {
      setLoading(true);
      setError(null);
      try {
        const id = Array.isArray(query.id) ? query.id[0] : String(query.id);
        const url = `${process.env.NEXT_PUBLIC_API_URL}/tests/${id}/review`;
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await axios.get(url, { headers });
        // Cast to a permissive shape so TypeScript knows these optional fields may exist
        const data = (res.data ?? {}) as ReviewResponse;

        if (cancelled) return;

        // Keep explanation nullable to indicate "no explanation yet" if backend hasn't provided one
        setDetails(Array.isArray(data.questions) ? (data.questions as Explanation[]) : null);
        setScore(typeof data.score === 'number' ? data.score : null);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.response?.statusText ?? err?.message ?? 'Failed to load review';
        if (!cancelled) setError(String(msg));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReview();

    return () => {
      cancelled = true;
    };
  }, [mounted, user, token, query.id]);

  function toggleExplanation(idx: number) {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  }

  // Show a neutral loading UI on the server / initial render to avoid hydration errors.
  if (!mounted) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', mt: 6, px: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!user && !token) return <Typography sx={{ mt: 4 }}>Please sign in to view your review.</Typography>;
  if (loading) return <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;
  if (!details || details.length === 0) return <Typography sx={{ mt: 4 }}>No review data found.</Typography>;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 6, px: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            startIcon={<ArrowBack />}
            onClick={() => {
              // Deterministic behavior: go to dashboard
              router.push('/dashboard');
            }}
            variant="text"
            sx={{ textTransform: 'none' }}
          >
            Back to dashboard
          </Button>

          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Test Review
          </Typography>
        </Stack>

        <Chip
          label={`Score: ${score ?? '—'}`}
          color="default"
          variant="outlined"
          sx={{ fontWeight: 600, borderRadius: 1.5 }}
        />
      </Stack>

      <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 1 }}>
        <List disablePadding>
          {details.map((q, idx) => {
            const correct = Boolean(q.isCorrect);
            return (
              <Box key={String(q.id ?? idx)}>
                <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                  <Stack direction="row" spacing={2} sx={{ width: '100%' }} alignItems="flex-start">
                    <Box sx={{ width: 38, mt: 0.5, display: 'flex', justifyContent: 'center' }}>
                      {correct ? (
                        <CheckCircleOutline sx={{ color: 'success.main', fontSize: 22 }} />
                      ) : (
                        <CancelOutlined sx={{ color: 'error.main', fontSize: 22 }} />
                      )}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {idx + 1}. {q.question}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Your answer:{' '}
                          <Typography component="span" sx={{ fontWeight: 700, color: correct ? 'text.primary' : 'error.main' }}>
                            {q.yourAnswer ?? '—'}
                          </Typography>
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Correct:{' '}
                          <Typography component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {q.correctAnswer ?? '—'}
                          </Typography>
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          onClick={() => toggleExplanation(idx)}
                          aria-label={openIndex === idx ? 'Hide explanation' : 'Show explanation'}
                        >
                          <ExpandMore sx={{ transform: openIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)', transition: '200ms' }} />
                        </IconButton>
                      </Box>

                      <Collapse in={openIndex === idx} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 1, p: 1.25, bgcolor: '#fafafa', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {q.explanation ?? 'No explanation available.'}
                          </Typography>
                        </Box>
                      </Collapse>
                    </Box>
                  </Stack>
                </ListItem>

                {idx < details.length - 1 && <Divider component="li" />}
              </Box>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
}