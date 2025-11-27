import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Paper,
  Typography,
  Collapse,
  Grid,
  Divider,
  Stack,
} from '@mui/material';
import adminApi from '../../lib/adminApi';

type PromptModel = {
  key?: string;
  name?: string;
  description?: string;
  body?: string;
  enabled?: boolean;
  version?: number;
  example?: string;
};

const EMPTY_PROMPT: PromptModel = {
  key: '',
  name: '',
  description: '',
  body: '',
  enabled: true,
  version: 1,
  example: '',
};

export default function PromptEditor({ initial = {}, onSaved }: { initial?: PromptModel; onSaved?: () => void }) {
  // Local editable prompt state
  const [prompt, setPrompt] = useState<PromptModel>({ ...EMPTY_PROMPT, ...initial });
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Simple labeled inputs for non-technical admins (these feed placeholders for preview)
  const [previewTopic, setPreviewTopic] = useState('quadratic equations');
  const [previewDifficulty, setPreviewDifficulty] = useState('beginner');
  const [previewQuestionCount, setPreviewQuestionCount] = useState(1);

  // Focus ref for the Key input so we can focus after clearing
  const keyInputRef = useRef<HTMLInputElement | null>(null);

  // If parent changes initial (e.g., loading a template), update local state
  useEffect(() => {
    setPrompt({ ...EMPTY_PROMPT, ...initial });
  }, [initial]);

  const helpLines = [
    'What is a prompt? — It is the exact instruction you give the AI. Write it like a clear request.',
    'Placeholders — Use {{topic}}, {{difficulty}}, {{questionCount}}, {{question}}, {{userAnswer}}, {{correctAnswer}} where needed.',
    'Preview/Test — runs the template with the example values you set below. Previews do NOT save anything.',
    'If you want machine-readable questions (so the site can save them), tell the AI to "Return ONLY a JSON array" and show one small example JSON line.',
    'Keep prompts short and specific. Preview uses OpenAI credits; test with small values (questionCount = 1).',
  ];

  async function handlePreview() {
    setLoadingPreview(true);
    setPreviewResult(null);
    try {
      const placeholders: Record<string, string> = {
        topic: String(previewTopic || ''),
        difficulty: String(previewDifficulty || ''),
        questionCount: String(previewQuestionCount ?? 1),
        question: 'Solve x^2 - 4 = 0',
        userAnswer: 'x = 2',
        correctAnswer: 'x = 2',
        targetDifficulty: String(previewDifficulty || ''),
      };
      const res = await adminApi.post<any>('/admin/prompts/preview', {
        prompt: prompt.body || '',
        placeholders,
        model: 'gpt-4o',
        temperature: 0.2,
        max_tokens: 800,
      });
      setPreviewResult(res.data);
    } catch (err) {
      const e = err as any;
      setPreviewResult({ error: e?.response?.data ?? e?.message ?? String(err) });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleSave() {
    try {
      await adminApi.post('/admin/prompts', {
        key: prompt.key,
        template: prompt.body,
        description: prompt.description,
        metadata: { version: prompt.version ?? 1, example: prompt.example },
        enabled: prompt.enabled ?? true,
      });
      if (onSaved) onSaved();
      alert('Saved');
    } catch (err) {
      const e = err as any;
      console.error('Save failed', e?.response?.data ?? e?.message ?? err);
      alert('Save failed');
    }
  }

  // Clear the editor fields and focus the Key input so user can start fresh
  function clearEditor() {
    setPrompt({ ...EMPTY_PROMPT });
    setPreviewTopic('quadratic equations');
    setPreviewDifficulty('beginner');
    setPreviewQuestionCount(1);
    setPreviewResult(null);
    // focus the key input after a small delay to ensure it exists in DOM
    setTimeout(() => {
      try {
        keyInputRef.current?.focus();
        // place caret at end if possible
        const el = keyInputRef.current;
        if (el && typeof el.setSelectionRange === 'function') {
          const len = el.value?.length ?? 0;
          el.setSelectionRange(len, len);
        }
      } catch {}
    }, 50);
  }

  return (
    <Paper sx={{ p: 2, mb: 2, background: '#fff' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6">Prompt Editor</Typography>

        {/* Top action buttons: Clear Editor (tabbable), Preview, Save, Help */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={clearEditor}
            variant="outlined"
            color="inherit"
            aria-label="Clear editor"
            title="Clear editor (remove all fields)"
          >
            Clear Editor
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            inputRef={keyInputRef}
            label="Key (unique)"
            value={prompt.key || ''}
            onChange={(e) => setPrompt({ ...prompt, key: e.target.value })}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Name (friendly)"
            value={prompt.name || ''}
            onChange={(e) => setPrompt({ ...prompt, name: e.target.value })}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Short description"
            value={prompt.description || ''}
            onChange={(e) => setPrompt({ ...prompt, description: e.target.value })}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Prompt body (use {{placeholder}})"
            value={prompt.body || ''}
            onChange={(e) => setPrompt({ ...prompt, body: e.target.value })}
            fullWidth
            multiline
            minRows={6}
            sx={{ mb: 2 }}
          />
        </Grid>

        <Grid item xs={12} md={3}>
          <TextField
            label="Version"
            value={String(prompt.version ?? 1)}
            onChange={(e) => setPrompt({ ...prompt, version: Number(e.target.value || 1) })}
            fullWidth
            size="small"
            type="number"
            sx={{ mb: 2 }}
          />
        </Grid>

        <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={prompt.enabled ?? true} onChange={(e) => setPrompt({ ...prompt, enabled: e.target.checked })} />}
            label="Enabled"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Canonical example / expected output (optional)"
            value={prompt.example || ''}
            onChange={(e) => setPrompt({ ...prompt, example: e.target.value })}
            fullWidth
            multiline
            minRows={2}
            sx={{ mb: 2 }}
          />
        </Grid>

        {/* Preview example values area with increased spacing and visual separation */}
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, background: '#fafafa' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Preview example values (editable)</Typography>

            <Stack spacing={2}>
              <TextField
                label="Topic ({{topic}})"
                value={previewTopic}
                onChange={(e) => setPreviewTopic(e.target.value)}
                fullWidth
                size="small"
              />

              <TextField
                label="Difficulty ({{difficulty}})"
                value={previewDifficulty}
                onChange={(e) => setPreviewDifficulty(e.target.value)}
                fullWidth
                size="small"
              />

              <TextField
                label="Question count ({{questionCount}})"
                value={String(previewQuestionCount)}
                onChange={(e) => setPreviewQuestionCount(Math.max(1, Number(e.target.value || 1)))}
                fullWidth
                size="small"
                type="number"
              />
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8} sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="contained" onClick={handlePreview} disabled={loadingPreview || !(prompt.body && prompt.body.length > 5)}>
            {loadingPreview ? 'Previewing…' : 'Preview / Test'}
          </Button>
          <Button variant="outlined" onClick={handleSave}>Save</Button>

          <Button
            color="inherit"
            onClick={() => setHelpOpen((s) => !s)}
            sx={{ ml: 1 }}
          >
            {helpOpen ? 'Hide Help' : 'Help / How to use prompts'}
          </Button>
        </Grid>
      </Grid>

      <Collapse in={helpOpen} timeout="auto" unmountOnExit>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Simple guide (for non-technical users)</Typography>
          {helpLines.map((l, i) => (
            <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>{`\u2022 ${l}`}</Typography>
          ))}
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">Tip: Use the Preview button to test how the AI responds — previews do not save the prompt.</Typography>
          </Box>
        </Box>
      </Collapse>

      {previewResult && (
        <Box mt={2} sx={{ border: '1px solid rgba(0,0,0,0.06)', p: 1, borderRadius: 1 }}>
          <Typography variant="subtitle2">Preview result (raw)</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 420, overflow: 'auto', margin: 0 }}>
            {typeof previewResult === 'string' ? previewResult : JSON.stringify(previewResult, null, 2)}
          </pre>
        </Box>
      )}
    </Paper>
  );
}