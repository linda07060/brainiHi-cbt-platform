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

/**
 * Submission runner component.
 * - Reads pendingTestSubmission or LAST_CREATED_TEST from sessionStorage
 * - Submits to /tests/submit
 * - Renders inline score & per-question explanations/feedback if returned
 * - If backend returns an attempt/result id, navigates to /review?id=<id>
 *
 * This version is defensive about response shapes and result id extraction.
 */
export default function TestSubmission(): JSX.Element {
  const router = useRouter();

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
      // nothing to submit automatically
      return;
    }

    try {
      // Normalize original questions for rendering later
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
        // Build headers. If token wasn't stored in parsed, try to read one from sessionStorage (safe fallback).
        const tokenFromParsed = parsed?.token ?? undefined;
        const fallbackToken = typeof window !== 'undefined' ? sessionStorage.getItem('AUTH_TOKEN') : null;
        const token = tokenFromParsed ?? (fallbackToken ?? undefined);

        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        // Submit. Keep a generous timeout but avoid infinite hanging.
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/tests/submit`,
          parsed.payload,
          { headers, timeout: 120000 }
        );

        const data = res?.data ?? {};

        if (data?.warning) {
          setInlineWarning(String(data.warning));
        }

        if (data?.error || data?.message) {
          const msg = data.error ?? data.message;
          setSnack({ severity: 'error', message: String(msg) });
          setSubmitting(false);
          return;
        }

        // Best-effort extraction of score & total (many possible shapes)
        const score = data?.score ?? data?.result?.score ?? data?.marks ?? null;
        const total = data?.total ?? data?.result?.total ?? data?.max ?? (originalQuestions ? originalQuestions.length : null);

        // Extract per-question feedback in common shapes
        let feedback: QuestionFeedback[] | null = null;
        if (Array.isArray(data?.feedback)) feedback = data.feedback;
        else if (Array.isArray(data?.results)) feedback = data.results;
        else if (Array.isArray(data?.perQuestion)) feedback = data.perQuestion;
        else if (Array.isArray(data?.questions)) {
          // sometimes the response returns questions with correctness/explanation fields
          feedback = data.questions.map((q: any, idx: number) => ({
            questionId: q.id ?? q.questionId ?? idx,
            correct: q.correct ?? q.isCorrect,
            explanation: q.explanation ?? q.explanations ?? null,
            correctAnswer: q.correctAnswer ?? q.answer ?? null,
            ...q,
          }));
        }

        // If server provides explanations keyed by id
        if (!feedback && data?.explanations && typeof data.explanations === 'object' && originalQuestions) {
          feedback = [];
          for (const q of originalQuestions || []) {
            const id = q.id ?? q.questionId;
            feedback.push({
              questionId: id,
              explanation: data.explanations[id] ?? null,
            });
          }
        }

        // If we have any inline result info, render it
        if (score != null || feedback != null) {
          setResultScore(typeof score === 'number' ? score : null);
          setResultTotal(typeof total === 'number' ? total : (originalQuestions ? originalQuestions.length : null));
          setPerQuestionFeedback(feedback ?? null);
          try { sessionStorage.removeItem('pendingTestSubmission'); } catch {}
          setSnack({ severity: 'success', message: 'Submission complete — results shown below.' });
          setSubmitting(false);
          return;
        }

        // Otherwise, attempt to obtain an id to navigate to review.
        // Support many possible server shapes: { attempt: { id } }, { id }, { resultId }, { submissionId }, { attemptId }
        let resultId: string | number | null = null;
        if (data?.attempt && (data.attempt.id ?? data.attempt._id)) resultId = data.attempt.id ?? data.attempt._id;
        else if (data?.id) resultId = data.id;
        else if (data?.resultId) resultId = data.resultId;
        else if (data?.submissionId) resultId = data.submissionId;
        else if (data?.attemptId) resultId = data.attemptId;
        else if (data?.attempt && typeof data.attempt === 'number') resultId = data.attempt;

        // Notify other parts of app (dashboard) that tests changed; include id when available
        try {
          window.dispatchEvent(new CustomEvent('tests-changed', { detail: { id: resultId ?? null } }));
        } catch (e) {
          // ignore dispatch errors
          // eslint-disable-next-line no-console
          console.warn('Unable to dispatch tests-changed event', e);
        }

        // Remove pending submission marker and redirect if we have an id
        try { sessionStorage.removeItem('pendingTestSubmission'); } catch {}
        if (resultId) {
          setSnack({ severity: 'success', message: 'Submitted — opening results.' });
          // Use replace to avoid creating extra history entry
          router.replace({ pathname: '/review', query: { id: String(resultId) } });
          return;
        }

        // If the API indicated processing but didn't return an ID, show info and go to dashboard
        if (data?.processing) {
          setSnack({ severity: 'info', message: 'Submission accepted and is processing. Visit the dashboard to check results shortly.' });
          router.replace('/dashboard');
          return;
        }

        // Nothing useful returned
        setSnack({ severity: 'info', message: 'Submission complete — no inline result returned.' });
      } catch (err: any) {
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

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      {submitting ? (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <CircularProgress size={24} />
          <Typography>Processing submission — please wait...</Typography>
        </Box>
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