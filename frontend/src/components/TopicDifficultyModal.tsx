import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type TopicDifficultyResult = {
  topic: string;
  difficulty: Difficulty;
  questionCount: number;
  useExplanations: boolean;
} | null;

/**
 * Client-side math validator and suggestion data.
 * Keep this list in sync with the backend's canonical list (backend/src/test/math-topics.ts).
 */
const allowedTopicsSet = new Set<string>([
  'algebra',
  'linear algebra',
  'pre-algebra',
  'geometry',
  'trigonometry',
  'calculus',
  'differential calculus',
  'integral calculus',
  'multivariable calculus',
  'differential equations',
  'probability',
  'statistics',
  'combinatorics',
  'number theory',
  'discrete mathematics',
  'optimization',
  'real analysis',
  'complex analysis',
  'mathematical logic',
  'set theory',
  'graph theory',
  'matrix algebra',
  'vectors',
  'measure theory',
  'topology',
  'linear programming',
  'numerical analysis',
]);

const mathKeywords = [
  'algebra', 'geometry', 'trigonometry', 'calculus', 'probability', 'statistics',
  'combinator', 'number', 'matrix', 'vector', 'derivative', 'integral', 'limit',
  'equation', 'function', 'sequence', 'series', 'discrete', 'graph', 'optimization',
  'analysis', 'theorem', 'proof', 'linear', 'topology', 'measure',
];

// Build suggestion options: canonical topics first, followed by unique keywords
const canonicalTopics = Array.from(allowedTopicsSet);
const keywordOptions = Array.from(new Set(mathKeywords.filter((k) => !allowedTopicsSet.has(k))));
const SUGGESTIONS = [...canonicalTopics, ...keywordOptions];

function normalize(s: string) {
  return (s || '').trim().toLowerCase();
}

/** Heuristic: direct canonical match OR contains a math keyword OR tokenized match */
function looksLikeMath(topic: string): boolean {
  const norm = normalize(topic);
  if (!norm) return false;

  if (allowedTopicsSet.has(norm)) return true;

  for (const kw of mathKeywords) {
    if (norm.includes(kw)) return true;
  }

  // Tokenize conservatively. Escape the forward slash and put hyphen at end of class to avoid "range out of order".
  const tokens = norm.split(/[\s,;\/:()\-]+/);
  for (const t of tokens) {
    if (allowedTopicsSet.has(t)) return true;
    for (const kw of mathKeywords) {
      if (t.includes(kw)) return true;
    }
  }

  return false;
}

export default function TopicDifficultyModal(props: {
  open: boolean;
  initialTopic?: string;
  initialDifficulty?: Difficulty;
  // maximum allowed questions (from user's plan)
  maxQuestions?: number;
  // whether explanations are allowed by plan (frontend will still rely on server)
  explanationsAllowed?: boolean;
  onClose: (result: TopicDifficultyResult) => void;
}) {
  const { open, initialTopic = 'Mathematics', initialDifficulty = 'beginner', maxQuestions = 10, explanationsAllowed = true, onClose } = props;
  const [topic, setTopic] = useState<string>(initialTopic);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(Math.min(maxQuestions, Math.max(1, Math.floor(maxQuestions / 2) || 5)));
  const [useExplanations, setUseExplanations] = useState<boolean>(!!explanationsAllowed);

  useEffect(() => {
    if (open) {
      setTopic(initialTopic);
      setDifficulty(initialDifficulty);
      setTopicError(null);
      setQuestionCount(Math.min(maxQuestions, Math.max(1, Math.floor(maxQuestions / 2) || 5)));
      setUseExplanations(!!explanationsAllowed);
    }
  }, [open, initialTopic, initialDifficulty, maxQuestions, explanationsAllowed]);

  function handleStart() {
    const trimmed = topic?.trim() ?? '';
    if (!trimmed || trimmed.length < 2) {
      setTopicError('Please enter a topic (e.g. Algebra, Geometry)');
      return;
    }

    // Client-side math-only validation (mirrors backend)
    if (!looksLikeMath(trimmed)) {
      setTopicError('Topic must be mathematics-related (e.g. Algebra, Calculus, Probability).');
      return;
    }

    setTopicError(null);
    onClose({ topic: trimmed, difficulty, questionCount, useExplanations });
  }

  function handleCancel() {
    onClose(null);
  }

  // build question count options up to maxQuestions (1..maxQuestions)
  const options: number[] = [];
  const maxOpt = Math.max(1, Math.floor(maxQuestions));
  for (let i = 1; i <= maxOpt; i++) {
    options.push(i);
  }

  return (
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="sm">
      <DialogTitle>Start a new AI-generated test</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Autocomplete
            freeSolo
            options={SUGGESTIONS}
            value={topic}
            onChange={(_, value) => {
              if (typeof value === 'string') {
                setTopic(value);
                setTopicError(null);
              } else if (value && typeof value === 'object' && 'inputValue' in value) {
                setTopic(String((value as any).inputValue));
                setTopicError(null);
              } else {
                setTopic(String(value ?? ''));
                setTopicError(null);
              }
            }}
            onInputChange={(_, inputValue) => {
              setTopic(inputValue);
              if (topicError) setTopicError(null);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Topic"
                helperText={topicError || 'Enter a subject or topic, e.g. Algebra, Calculus, Probability'}
                error={!!topicError}
                fullWidth
                autoFocus
              />
            )}
          />

          <FormControl fullWidth>
            <InputLabel id="difficulty-label">Difficulty</InputLabel>
            <Select
              labelId="difficulty-label"
              label="Difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <MenuItem value="beginner">Beginner</MenuItem>
              <MenuItem value="intermediate">Intermediate</MenuItem>
              <MenuItem value="advanced">Advanced</MenuItem>
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              The AI will generate questions tuned to this difficulty (counts will respect plan limits).
            </Typography>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="question-count-label">Number of questions</InputLabel>
            <Select
              labelId="question-count-label"
              label="Number of questions"
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            >
              {options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </Select>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Select how many questions you want in this test (limited by your plan).
            </Typography>
          </FormControl>

          <FormControlLabel
            control={<Switch checked={useExplanations} onChange={(e) => setUseExplanations(e.target.checked)} disabled={!explanationsAllowed} />}
            label={explanationsAllowed ? 'Include AI explanations' : 'AI explanations not available on your plan'}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleStart}>Start test</Button>
      </DialogActions>
    </Dialog>
  );
}