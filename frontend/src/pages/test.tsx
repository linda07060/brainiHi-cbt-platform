import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  LinearProgress,
  TextField,
  FormControl,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Question {
  id?: number | string;
  question: string;
  options?: string[];
  [k: string]: any;
}

function getLocalAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || 'null');
    return auth?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Test page that prefers LAST_CREATED_TEST / pendingTestSubmission saved payloads,
 * falls back to session endpoints, and finally calls ai/generate-test if necessary.
 * It persists any generated payload to LAST_CREATED_TEST so TestSubmission (runner)
 * can read it reliably.
 */
export default function TestPage(): JSX.Element {
  const { user } = useAuth() as any;
  const router = useRouter();
  const query = router.query;

  const [topic, setTopic] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [qid: string]: string }>({});
  const [step, setStep] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [requestedCount, setRequestedCount] = useState<number>(5);
  const [useExplanations, setUseExplanations] = useState<boolean>(false);

  const topics = ['Algebra', 'Geometry', 'Logic', 'Calculus', 'Statistics', 'Indices'];

  // Read query params into local state
  useEffect(() => {
    if (query?.topic) setTopic(Array.isArray(query.topic) ? query.topic[0] : String(query.topic));
    if (query?.difficulty) setDifficulty(Array.isArray(query.difficulty) ? query.difficulty[0] : String(query.difficulty));
    if (query?.questionCount) {
      const n = Number(Array.isArray(query.questionCount) ? query.questionCount[0] : query.questionCount);
      if (!isNaN(n) && n > 0) setRequestedCount(Math.max(1, Math.floor(n)));
    }
    if (query?.useExplanations) {
      const v = Array.isArray(query.useExplanations) ? query.useExplanations[0] : String(query.useExplanations);
      setUseExplanations(v === 'true' || v === '1');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query?.topic, query?.difficulty, query?.questionCount, query?.useExplanations]);

  // Kick off load when session query provided
  useEffect(() => {
    const session = query?.session ?? query?.id ?? null;
    if (session && questions.length === 0 && !loading) {
      const sessionId = Array.isArray(session) ? session[0] : String(session);
      fetchSessionAndPopulate(sessionId).catch((e) => console.error('fetchSessionAndPopulate error', e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query?.session, query?.id]);

  // Read candidate payloads from sessionStorage
  function readCandidatePayload(): { payload: any; token?: string | null; sessionId?: string | number | null } | null {
    if (typeof window === 'undefined') return null;
    try {
      const pendingRaw = sessionStorage.getItem('pendingTestSubmission');
      if (pendingRaw) {
        const parsed = JSON.parse(pendingRaw);
        const candidate = parsed.payload ?? parsed;
        if (candidate && (Array.isArray(candidate.questions) && candidate.questions.length > 0)) {
          return { payload: candidate, token: parsed.token ?? null, sessionId: parsed.sessionId ?? null };
        }
      }
    } catch {}
    try {
      const lastRaw = sessionStorage.getItem('LAST_CREATED_TEST');
      if (lastRaw) {
        const parsed = JSON.parse(lastRaw);
        const candidate = parsed.payload ?? parsed;
        if (candidate && Array.isArray(candidate.questions) && candidate.questions.length > 0) {
          return { payload: candidate, token: parsed.token ?? null, sessionId: parsed.sessionId ?? null };
        }
        if (candidate?.test && Array.isArray(candidate.test.questions) && candidate.test.questions.length > 0) {
          return { payload: candidate.test, token: parsed.token ?? null, sessionId: parsed.sessionId ?? null };
        }
      }
    } catch {}
    return null;
  }

  // Main session/test loading logic
  async function fetchSessionAndPopulate(sessionId: string) {
    setLoading(true);
    setLoadError(null);

    // 1) Prefer saved LAST_CREATED_TEST if it matches sessionId
    try {
      const lastRaw = typeof window !== 'undefined' ? sessionStorage.getItem('LAST_CREATED_TEST') : null;
      if (lastRaw) {
        const saved = JSON.parse(lastRaw);
        if (saved && (saved.sessionId != null) && String(saved.sessionId) === String(sessionId)) {
          const payload = saved.payload ?? null;
          const qs = payload?.questions ?? payload?.items ?? payload?.test?.questions ?? null;
          if (Array.isArray(qs) && qs.length > 0) {
            setQuestions(qs);
            if (payload.topic) setTopic(payload.topic);
            if (payload.difficulty) setDifficulty(payload.difficulty);
            setStep(1);
            setLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      // continue to next steps
    }

    // 2) Try any pending/payload candidate even if it doesn't have sessionId but only as a fallback
    const candidate = readCandidatePayload();
    if (candidate && (!candidate.sessionId || String(candidate.sessionId) === String(sessionId))) {
      const qs = candidate.payload.questions ?? candidate.payload.items ?? candidate.payload.test?.questions ?? null;
      if (Array.isArray(qs) && qs.length > 0) {
        setQuestions(qs);
        if (candidate.payload.topic) setTopic(candidate.payload.topic);
        if (candidate.payload.difficulty) setDifficulty(candidate.payload.difficulty);
        setStep(1);
        setLoading(false);
        return;
      }
    }

    // 3) Try server session endpoints
    const token = user?.token || getLocalAuthToken();
    if (!token) {
      setLoadError('Not logged in.');
      setLoading(false);
      return;
    }

    const candidates = [
      `${process.env.NEXT_PUBLIC_API_URL}/tests/${sessionId}`,
      `${process.env.NEXT_PUBLIC_API_URL}/tests/session/${sessionId}`,
      `${process.env.NEXT_PUBLIC_API_URL}/tests/get/${sessionId}`,
      `${process.env.NEXT_PUBLIC_API_URL}/ai/session/${sessionId}`,
      `/api/tests/${sessionId}`,
      `/api/tests/session/${sessionId}`,
    ];

    for (const url of candidates) {
      try {
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 });
        const data = res.data ?? {};
        const qs = data.questions ?? data.items ?? data.test?.questions ?? data.questions_list;
        if (Array.isArray(qs) && qs.length > 0) {
          setQuestions(qs);
          if (data.topic) setTopic(data.topic);
          if (data.difficulty) setDifficulty(data.difficulty);
          setStep(1);
          setLoading(false);
          try { sessionStorage.setItem('LAST_CREATED_TEST', JSON.stringify({ sessionId, payload: data, token })); } catch {}
          return;
        }
      } catch (err) {
        // continue trying other endpoints
      }
    }

    // 4) Fallback: generate now with ai/generate-test (send multiple count keys)
    const fallbackTopic = topic || (query?.topic ? (Array.isArray(query.topic) ? query.topic[0] : String(query.topic)) : undefined);
    const fallbackDifficulty = difficulty || (query?.difficulty ? (Array.isArray(query.difficulty) ? query.difficulty[0] : String(query.difficulty)) : undefined);
    const fallbackCount = query?.questionCount ? Number(Array.isArray(query.questionCount) ? query.questionCount[0] : query.questionCount) : requestedCount;

    if (!fallbackTopic) {
      setLoadError('Unable to load session and no topic available.');
      setLoading(false);
      return;
    }

    try {
      const genReq = {
        topic: fallbackTopic,
        difficulty: fallbackDifficulty ?? 'beginner',
        questionCount: fallbackCount,
        question_count: fallbackCount,
        count: fallbackCount,
        useExplanations,
      };
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/ai/generate-test`, genReq, { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 });
      const genQuestions = res.data?.questions ?? res.data?.items ?? res.data?.test?.questions ?? [];
      if (Array.isArray(genQuestions) && genQuestions.length > 0) {
        setQuestions(genQuestions);
        setTopic(fallbackTopic);
        if (fallbackDifficulty) setDifficulty(fallbackDifficulty);
        setStep(1);
        try {
          const saved = { sessionId, payload: res.data, token, metadata: { topic: fallbackTopic, difficulty: fallbackDifficulty, questionCount: fallbackCount, useExplanations } };
          sessionStorage.setItem('LAST_CREATED_TEST', JSON.stringify(saved));
        } catch {}
        setLoading(false);
        return;
      } else {
        setLoadError('Server returned no questions when generating fallback.');
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to generate test.');
      console.error('generate-test fallback error', err?.response ?? err);
    } finally {
      setLoading(false);
    }
  }

  // User-driven generate
  const handleStart = async () => {
    const token = user?.token || getLocalAuthToken();
    if (!token) {
      setLoadError('You must be logged in to generate a test.');
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      const body: any = {
        topic,
        difficulty,
        questionCount: requestedCount,
        question_count: requestedCount,
        count: requestedCount,
        useExplanations,
      };
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/ai/generate-test`, body, { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 });
      const q = res.data?.questions ?? res.data?.items ?? res.data?.test?.questions ?? [];
      if (Array.isArray(q) && q.length > 0) {
        setQuestions(q);
        setStep(1);
        try {
          const saved = { sessionId: res.data?.sessionId ?? null, payload: res.data, token, metadata: { topic, difficulty, questionCount: requestedCount, useExplanations } };
          sessionStorage.setItem('LAST_CREATED_TEST', JSON.stringify(saved));
        } catch {}
      } else {
        setLoadError('Server returned no questions.');
      }
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Failed to generate test.');
      console.error('handleStart generate error', err?.response ?? err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qid: number | string, value: string) => {
    setAnswers((prev) => ({ ...prev, [String(qid)]: value }));
  };

  // Submit: persist pendingTestSubmission and navigate to runner (/test/submit)
  const handleSubmit = async () => {
    const token = user?.token || getLocalAuthToken();
    if (!token) {
      setLoadError('You must be logged in to submit the test.');
      return;
    }
    if (questions.length > 0 && Object.keys(answers).length !== questions.length) {
      setLoadError('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    setLoadError(null);

    const payload: any = {
      answers,
      questions,
      topic,
      difficulty,
      questionCount: questions.length,
      useExplanations,
    };

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingTestSubmission', JSON.stringify({ token, payload }));
        // keep LAST_CREATED_TEST consistent for debugging
        try {
          const raw = sessionStorage.getItem('LAST_CREATED_TEST');
          const saved = raw ? JSON.parse(raw) : {};
          saved.payload = saved.payload ?? payload;
          saved.token = saved.token ?? token;
          sessionStorage.setItem('LAST_CREATED_TEST', JSON.stringify(saved));
        } catch {}
      }
      await router.push('/test/submit');
    } catch (err) {
      setLoadError('Failed to start submission. Try again.');
      console.error('handleSubmit navigation error', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user && !getLocalAuthToken()) {
    return (
      <Typography>
        Please <Link href="/login">login</Link>.
      </Typography>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 5 }}>
      <Paper sx={{ p: 3 }}>
        {step === 0 ? (
          <>
            <Typography variant="h5" fontWeight="bold" mb={2}>
              Start a New Test
            </Typography>

            {loadError && <Typography color="error" sx={{ mb: 2 }}>{loadError}</Typography>}

            <FormLabel>Choose Topic</FormLabel>
            <RadioGroup value={topic} onChange={(e) => setTopic(e.target.value)} row sx={{ mb: 2 }}>
              {topics.map((t) => (
                <FormControlLabel key={t} value={t} control={<Radio />} label={t} />
              ))}
            </RadioGroup>

            <FormLabel>Difficulty</FormLabel>
            <RadioGroup value={difficulty} onChange={(e) => setDifficulty(e.target.value)} row sx={{ mb: 2 }}>
              <FormControlLabel value="beginner" control={<Radio />} label="Beginner" />
              <FormControlLabel value="intermediate" control={<Radio />} label="Intermediate" />
              <FormControlLabel value="advanced" control={<Radio />} label="Advanced" />
            </RadioGroup>

            <FormControl sx={{ mb: 2 }}>
              <TextField
                label="Number of questions"
                type="number"
                inputProps={{ min: 1, max: 100 }}
                value={requestedCount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!isNaN(v)) setRequestedCount(Math.max(1, Math.floor(v)));
                }}
                helperText="Choose how many questions you want"
                sx={{ width: 220 }}
              />
            </FormControl>

            <Box sx={{ mt: 2 }}>
              <Button variant="contained" disabled={!topic || loading} onClick={handleStart}>
                {loading ? <CircularProgress size={20} /> : 'Generate Test'}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Stepper activeStep={Object.keys(answers).length} alternativeLabel>
              {questions.map((_, idx) => (
                <Step key={idx}>
                  <StepLabel>Q{idx + 1}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <LinearProgress variant="determinate" value={questions.length ? (Object.keys(answers).length / questions.length) * 100 : 0} sx={{ my: 2 }} />

            {questions.map((q, idx) => (
              <Box key={String(q.id ?? idx)} sx={{ mb: 3 }}>
                <Typography variant="h6" mb={1}>
                  {idx + 1}. {q.question}
                </Typography>
                <RadioGroup value={answers[String(q.id ?? idx)] || ''} onChange={(e) => handleAnswer(q.id ?? idx, e.target.value)}>
                  {(q.options ?? []).map((opt: string) => (
                    <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
                  ))}
                </RadioGroup>
              </Box>
            ))}

            {loadError && <Typography color="error" sx={{ mb: 2 }}>{loadError}</Typography>}

            <Box sx={{ mt: 2 }}>
              <Button variant="contained" color="success" disabled={Object.keys(answers).length !== questions.length || submitting} onClick={handleSubmit}>
                {submitting ? <CircularProgress size={20} /> : 'Submit Test'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}