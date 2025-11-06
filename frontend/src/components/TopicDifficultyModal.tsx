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

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type TopicDifficultyResult = {
  topic: string;
  difficulty: Difficulty;
  questionCount: number;
  useExplanations: boolean;
} | null;

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
  const [questionCount, setQuestionCount] = useState<number>(Math.min(maxQuestions,  Math.max(1,  Math.floor(maxQuestions / 2) || 5 )));
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
    if (!topic || topic.trim().length < 2) {
      setTopicError('Please enter a topic (e.g. Algebra, Geometry)');
      return;
    }
    onClose({ topic: topic.trim(), difficulty, questionCount, useExplanations });
  }

  function handleCancel() {
    onClose(null);
  }

  // build question count options up to maxQuestions (1..maxQuestions)
  const options = [];
  const maxOpt = Math.max(1, Math.floor(maxQuestions));
  for (let i = 1; i <= maxOpt; i++) {
    options.push(i);
  }

  return (
    <Dialog open={open} onClose={handleCancel} fullWidth maxWidth="sm">
      <DialogTitle>Start a new AI-generated test</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            helperText={topicError || 'Enter a subject or topic, e.g. Algebra, Calculus, Probability'}
            error={!!topicError}
            fullWidth
            autoFocus
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