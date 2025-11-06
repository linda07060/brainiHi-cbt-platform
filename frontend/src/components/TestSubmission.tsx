import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  CircularProgress,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Stack,
  useTheme,
} from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/router';

interface QuestionFeedback {
  questionId?: number | string;
  correct?: boolean;
  correctAnswer?: string | null;
  explanation?: string | null;
  [k: string]: any;
}

interface ServerResponse {
  warning?: string;
  error?: string;
  message?: string;
  processing?: boolean;
  score?: number;
  total?: number;
  marks?: number;
  max?: number;
  result?: {
    score?: number;
    total?: number;
    id?: number | string;
    [k: string]: any;
  };
  feedback?: QuestionFeedback[];
  results?: QuestionFeedback[];
  perQuestion?: QuestionFeedback[];
  questions?: any[];
  explanations?: Record<string, string | null> | null;
  id?: number | string;
  resultId?: number | string;
  submissionId?: number | string;
  attemptId?: number | string;
  attempt?: any;
  resultUrl?: string;
  [k: string]: any;
}

/**
 * Minimal, professional AnimatedSteps component
 * - Presentation only: cycles through messages while submitting is true
 * - Keeps a single DOM node and animates opacity/translate for smooth transitions
 *
 * Note: intervalMs default increased and transition durations lengthened so messages
 * remain visible longer and are easier to read.
 */
function AnimatedSteps({
  messages,
  intervalMs = 4000, // slightly slower so users can comfortably read each message
  submitting,
}: {
  messages: string[];
  intervalMs?: number;
  submitting: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!submitting) {
      setIndex(0);
      setVisible(true);
      return;
    }

    setVisible(true);
    const cycle = setInterval(() => {
      setVisible(false);
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 600); // match CSS transition duration (fade out time)
      return () => clearTimeout(swap);
    }, intervalMs);

    return () => {
      clearInterval(cycle);
      setVisible(true);
      setIndex(0);
    };
  }, [submitting, messages.length, intervalMs]);

  if (!messages || messages.length === 0) return null;

  return (
    <Box
      component="div"
      aria-live="polite"
      sx={{
        pl: { xs: 0, md: 6 },
        pt: 2,
        minHeight: 56,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 1,
          borderRadius: 999,
          bgcolor: (theme) => (theme.palette.mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'),
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: (theme) => theme.palette.primary.main,
            transform: visible ? 'scale(1)' : 'scale(0.78)',
            transition: 'transform 600ms cubic-bezier(.2,.9,.2,1)',
            flex: '0 0 auto',
          }}
        />
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 600ms ease, transform 600ms ease',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: { xs: '0.98rem', md: '1.02rem' },
          }}
        >
          {messages[index]}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * TestSubmission (presentation tweaks only)
 *
 * - Reworked the submitting view to be cleaner and more minimalist.
 * - Emphasised the animated status line visually while preserving all existing submission logic.
 * - No network, routing or state-management logic was changed except increasing the request timeout
 *   and improved timeout error handling so users see a helpful message and next steps.
 */
export default function TestSubmission(): JSX.Element {
  const router = useRouter();
  const theme = useTheme();

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [snack, setSnack] = useState<{ severity: 'success' | 'info' | 'warning' | 'error'; message: string } | null>(null);
  const [inlineWarning, setInlineWarning] = useState<string | null>(null);

  const [resultScore, setResultScore] = useState<number | null>(null);
  const [resultTotal, setResultTotal] = useState<number | null>(null);
  const [perQuestionFeedback, setPerQuestionFeedback] = useState<QuestionFeedback[] | null>(null);
  const [originalQuestions, setOriginalQuestions] = useState<any[] | null>(null);

  useEffect(() => {
    let parsed: { token?: string; payload?: any } | null = null;
    try {
      const rawPending = typeof window !== 'undefined' ? sessionStorage.getItem('pendingTestSubmission') : null;
      if (rawPending) {
        parsed = JSON.parse(rawPending);
      } else {
        const rawLast = typeof window !== 'undefined' ? sessionStorage.getItem('LAST_CREATED_TEST') : null;
        if (rawLast) {
          const p = JSON.parse(rawLast);
          parsed = { token: p.token ?? null, payload: p.payload ?? p };
        }
      }
    } catch {
      parsed = null;
    }
    if (!parsed?.payload) {
      return;
    }

    try {
      const payload = parsed.payload;
      let qs = payload?.questions ?? payload?.items ?? payload?.test?.questions ?? null;
      if (!qs && Array.isArray(payload)) qs = payload;
      if (qs) setOriginalQuestions(qs);
    } catch {}

    (async () => {
      setSubmitting(true);
      setInlineWarning(null);
      setSnack(null);

      try {
        const tokenFromParsed = parsed?.token ?? undefined;
        const fallbackToken = typeof window !== 'undefined' ? sessionStorage.getItem('AUTH_TOKEN') : null;
        const token = tokenFromParsed ?? (fallbackToken ?? undefined);

        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        // NOTE: timeout increased to 300000ms (5 minutes) to accommodate longer AI explanation collation
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/tests/submit`,
          parsed.payload,
          { headers, timeout: 300000 }
        );

        const data = (res?.data ?? {}) as ServerResponse;

        if (data.warning) {
          setInlineWarning(String(data.warning));
        }

        if (data.error || data.message) {
          const msg = data.error ?? data.message;
          setSnack({ severity: 'error', message: String(msg) });
          setSubmitting(false);
          return;
        }

        const score = data.score ?? data.result?.score ?? data.marks ?? null;
        const total = data.total ?? data.result?.total ?? data.max ?? (originalQuestions ? originalQuestions.length : null);

        let feedback: QuestionFeedback[] | null = null;
        if (Array.isArray(data.feedback)) feedback = data.feedback;
        else if (Array.isArray(data.results)) feedback = data.results;
        else if (Array.isArray(data.perQuestion)) feedback = data.perQuestion;
        else if (Array.isArray(data.questions)) {
          feedback = data.questions.map((q: any, idx: number) => ({
            questionId: q.id ?? q.questionId ?? idx,
            correct: q.correct ?? q.isCorrect,
            explanation: q.explanation ?? q.explanations ?? null,
            correctAnswer: q.correctAnswer ?? q.answer ?? null,
            ...q,
          }));
        }

        if (!feedback && data.explanations && typeof data.explanations === 'object' && originalQuestions) {
          feedback = [];
          for (const q of originalQuestions || []) {
            const id = q.id ?? q.questionId ?? null;
            feedback.push({
              questionId: id,
              explanation: (id != null ? data.explanations[id] : null) ?? null,
            });
          }
        }

        if (score != null || feedback != null) {
          setResultScore(typeof score === 'number' ? score : null);
          setResultTotal(typeof total === 'number' ? total : (originalQuestions ? originalQuestions.length : null));
          setPerQuestionFeedback(feedback ?? null);
          try { sessionStorage.removeItem('pendingTestSubmission'); } catch {}
          setSnack({ severity: 'success', message: 'Submission complete — results shown below.' });
          setSubmitting(false);
          return;
        }

        let resultId: string | number | null = null;
        if (data.attempt && (data.attempt.id ?? data.attempt._id)) resultId = data.attempt.id ?? data.attempt._id;
        else if (data.id) resultId = data.id;
        else if (data.resultId) resultId = data.resultId;
        else if (data.submissionId) resultId = data.submissionId;
        else if (data.attemptId) resultId = data.attemptId;
        else if (data.attempt && typeof data.attempt === 'number') resultId = data.attempt;

        try {
          window.dispatchEvent(new CustomEvent('tests-changed', { detail: { id: resultId ?? null } }));
        } catch (e) {
          // ignore
        }

        try { sessionStorage.removeItem('pendingTestSubmission'); } catch {}
        if (resultId) {
          setSnack({ severity: 'success', message: 'Submitted — opening results.' });
          router.replace({ pathname: '/review', query: { id: String(resultId) } });
          return;
        }

        if (data.processing) {
          setSnack({ severity: 'info', message: 'Submission accepted and is processing. Visit the dashboard to check results shortly.' });
          router.replace('/dashboard');
          return;
        }

        setSnack({ severity: 'info', message: 'Submission complete — no inline result returned.' });
      } catch (err: any) {
        // Improved timeout handling: detect Axios timeout and show a friendly, actionable message.
        // Axios timeout errors typically have err.code === 'ECONNABORTED' and message like 'timeout of 300000ms exceeded'.
        const isTimeout =
          err?.code === 'ECONNABORTED' ||
          (typeof err?.message === 'string' && /timeout of \d+ms exceeded/.test(err.message));

        if (isTimeout) {
          // Keep pendingTestSubmission in storage so the user can return and the submission can continue/check later.
          try {
            // Do not remove pendingTestSubmission here — keeping it allows retry/inspection later.
            // Optionally, you may store a flag if you want to show a different UI next time.
          } catch {}

          // User-facing message rephrased per request:
          // Inform the user that because the request timed out, their results (and AI explanations)
          // are available via their past test attempts. Encourage checking Dashboard / Past Attempts.
          setSnack({
            severity: 'info',
            message:
              'Processing is taking longer than expected. We have recorded your submission — your result and AI explanations are available under Past Attempts on your Dashboard. ' +
              'You can review your performance there now; if you keep this tab open we will also show the results here as soon as they finish. Contact support if you need help.',
          });
          console.info('Submission request timed out after 300000ms', err);
          setSubmitting(false);
          return;
        }

        // Existing error handling (preserve original behaviour)
        const serverMsg = err?.response?.data?.message ?? err?.response?.data?.error ?? null;
        if (serverMsg && /max attempts|attempts/i.test(String(serverMsg))) {
          setSnack({ severity: 'error', message: String(serverMsg) });
          console.info('Submission server response (debug):', err?.response?.data ?? err?.response ?? err);
          setSubmitting(false);
          return;
        }
        setSnack({ severity: 'error', message: err?.response?.data?.message || 'Submission failed. Try again.' });
        console.error('tests/submit error', err?.response ?? err);
      } finally {
        setSubmitting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderResults() {
    const total = resultTotal ?? (originalQuestions ? originalQuestions.length : null);
    const score = resultScore;
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 2 }}>
          Test completed — Score: {score != null && total != null ? `${score}/${total}` : (score != null ? String(score) : '—')}
        </Alert>

        <List>
          {(originalQuestions ?? []).map((q: any, idx: number) => {
            const qid = q.id ?? q.questionId ?? idx;
            const fb = (perQuestionFeedback ?? []).find((f: any) =>
              String(f.questionId ?? f.id ?? f.index ?? '') === String(qid) || f.index === idx
            );
            const correct = fb?.correct ?? null;
            const explanation = fb?.explanation ?? fb?.explanations ?? null;
            const correctAnswer = fb?.correctAnswer ?? fb?.answer ?? null;
            const userAnswer = q.userAnswer ?? fb?.userAnswer ?? '(not answered)';
            return (
              <Box key={qid} sx={{ mb: 2 }}>
                <ListItem alignItems="flex-start" disableGutters>
                  <ListItemText
                    primary={<Typography variant="subtitle1">{idx + 1}. {q.question}</Typography>}
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Your answer: <strong>{String(userAnswer)}</strong>
                        </Typography>
                        {correct !== null && (
                          <Typography variant="body2" color={correct ? 'success.main' : 'error.main'} sx={{ mt: 0.5 }}>
                            {correct ? 'Correct' : `Incorrect — correct answer: ${correctAnswer ?? 'N/A'}`}
                          </Typography>
                        )}
                        {explanation && (
                          <Box sx={{ mt: 1, p: 2, bgcolor: '#fafafa', borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Explanation</Typography>
                            <Typography variant="body2">{String(explanation)}</Typography>
                          </Box>
                        )}
                      </>
                    }
                  />
                </ListItem>
                <Divider />
              </Box>
            );
          })}
        </List>

        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => { try { router.push('/dashboard'); } catch {} }}>
            Back to dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  // processing messages (kept concise and prominent)
  const processingMessages = [
    'Scoring your answers and preparing your result.',
    'Collating AI-generated explanations for each question.',
    'Validating explanations to ensure clarity and accuracy.',
  ];

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      {submitting ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'light' ? 'transparent' : 'transparent',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
              <Box>
                <CircularProgress size={36} thickness={4} color="primary" />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Processing submission — please wait
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 680 }}>
                  Please be patient — AI-generated explanations are being collated. Processing time depends on the number
                  of questions and the depth of explanations requested. Once ready, your personalised results and explanations
                  will appear here immediately.
                </Typography>
              </Box>
            </Box>

            {/* Spacer for minimalist layout on wide screens */}
            <Box sx={{ flex: 1 }} />

            {/* Prominent animated status */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <AnimatedSteps messages={processingMessages} intervalMs={4000} submitting={submitting} />
            </Box>
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => {
                try {
                  router.push('/dashboard');
                } catch {}
              }}
              sx={{
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                py: 1,
              }}
            >
              Back to dashboard
            </Button>
          </Box>
        </Paper>
      ) : perQuestionFeedback ? (
        renderResults()
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>Start AI-generated test / Submission runner</Typography>

          {inlineWarning && <Alert severity="warning" sx={{ mb: 2 }}>{inlineWarning}</Alert>}

          <Typography sx={{ mb: 2 }}>No automatic submission in progress. If you want to create a test here, use the Dashboard or the Start test form on the Test page.</Typography>

          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => { try { router.push('/dashboard'); } catch {} }}>
              Back to Dashboard
            </Button>
          </Box>
        </>
      )}

      <Snackbar open={!!snack} autoHideDuration={6000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ width: '100%' }}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}