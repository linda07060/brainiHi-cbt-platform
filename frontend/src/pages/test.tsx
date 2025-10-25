import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Stepper, Step, StepLabel, CircularProgress, RadioGroup, FormControlLabel, Radio, FormLabel, LinearProgress } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

interface Question {
  id: number;
  question: string;
  options: string[];
  type: string;
}

export default function TestPage() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [qid: number]: string }>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resultId, setResultId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch topics from backend (hardcoded fallback)
  const topics = ['Algebra', 'Geometry', 'Logic', 'Calculus', 'Statistics'];

  const handleStart = () => {
    setLoading(true);
    axios.post(`${process.env.NEXT_PUBLIC_API_URL}/ai/generate-test`, {
      topic,
      difficulty,
    }, {
      headers: { Authorization: `Bearer ${user.token}` },
    }).then(res => {
      setQuestions(res.data.questions);
      setStep(1);
    }).finally(() => setLoading(false));
  };

  const handleAnswer = (qid: number, value: string) => {
    setAnswers({ ...answers, [qid]: value });
  };

  const handleSubmit = () => {
    setSubmitting(true);
    axios.post(`${process.env.NEXT_PUBLIC_API_URL}/tests/submit`, {
      answers,
      questions,
      topic,
      difficulty,
    }, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(res => setResultId(res.data.id))
      .finally(() => setSubmitting(false));
  };

  if (!user) return <Typography>Please <Link href="/login">login</Link>.</Typography>;

  if (resultId) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 6, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight="bold" mb={2}>Test Submitted!</Typography>
        <Button component={Link} href={`/review?id=${resultId}`} variant="contained">
          View Results & Explanations
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 650, mx: 'auto', mt: 5 }}>
      <Paper sx={{ p: 3 }}>
        {step === 0 && (
          <>
            <Typography variant="h5" fontWeight="bold" mb={2}>Start a New Test</Typography>
            <FormLabel>Choose Topic</FormLabel>
            <RadioGroup value={topic} onChange={e => setTopic(e.target.value)} row sx={{ mb: 2 }}>
              {topics.map(t => (
                <FormControlLabel key={t} value={t} control={<Radio />} label={t} />
              ))}
            </RadioGroup>
            <FormLabel>Difficulty</FormLabel>
            <RadioGroup value={difficulty} onChange={e => setDifficulty(e.target.value)} row sx={{ mb: 2 }}>
              <FormControlLabel value="beginner" control={<Radio />} label="Beginner" />
              <FormControlLabel value="intermediate" control={<Radio />} label="Intermediate" />
              <FormControlLabel value="advanced" control={<Radio />} label="Advanced" />
            </RadioGroup>
            <Button
              variant="contained"
              disabled={!topic || loading}
              onClick={handleStart}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate Test'}
            </Button>
          </>
        )}
        {step === 1 && (
          <>
            <Stepper activeStep={Object.keys(answers).length} alternativeLabel>
              {questions.map((_, idx) => (
                <Step key={idx}>
                  <StepLabel>Q{idx + 1}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <LinearProgress
              variant="determinate"
              value={(Object.keys(answers).length / questions.length) * 100}
              sx={{ my: 2 }}
            />
            {questions.map((q, idx) => (
              <Box key={q.id} sx={{ mb: 3 }}>
                <Typography variant="h6" mb={1}>{idx + 1}. {q.question}</Typography>
                <RadioGroup
                  value={answers[q.id] || ''}
                  onChange={e => handleAnswer(q.id, e.target.value)}
                >
                  {q.options.map(opt => (
                    <FormControlLabel key={opt} value={opt} control={<Radio />} label={opt} />
                  ))}
                </RadioGroup>
              </Box>
            ))}
            <Button
              variant="contained"
              color="success"
              disabled={Object.keys(answers).length !== questions.length || submitting}
              onClick={handleSubmit}
              sx={{ mt: 2 }}
            >
              {submitting ? <CircularProgress size={24} /> : 'Submit Test'}
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}