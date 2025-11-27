import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Stack,
  IconButton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import adminApi from '../../lib/adminApi';
import styles from '../../styles/Admin.module.css';
import PromptEditor from '../../components/admin/PromptEditor';

type PromptItem = { id?: number; key: string; template: string; description?: string; metadata?: any };

// Two ready-made math templates for quick loading by non-technical admins
const SAMPLE_TEMPLATES_DEFAULTS: { title: string; body: string; description: string }[] = [
  {
    title: 'Single MCQ (JSON) — beginner',
    description: 'Generates one multiple-choice question in strict JSON format (machine-readable).',
    body: `Generate 1 {{difficulty}} multiple-choice math question about "{{topic}}".
Return ONLY a JSON array with one object in this format:
[
  {
    "id": "q1",
    "question": "...",
    "options": ["...", "...", "..."],
    "correctAnswer": "...",
    "explanation": "..."
  }
]`,
  },
  {
    title: 'Explain student answer (plain text)',
    description: 'Produce a short step-by-step explanation suitable for students.',
    body: `Question: {{question}}
Student's answer: {{userAnswer}}
Correct answer: {{correctAnswer}}

Give a short, step-by-step, student-friendly explanation for why the correct answer is right and, if different, why the student's answer is incorrect. Return plain text only.`,
  },
];

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // This state holds the initial object to populate the editor (e.g., when inserting a sample)
  const [editorInitial, setEditorInitial] = useState<any>({});

  // Local editable samples state (editable inline)
  const [sampleTemplates, setSampleTemplates] = useState(() =>
    SAMPLE_TEMPLATES_DEFAULTS.map((s) => ({ ...s })),
  );

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get<{ items: PromptItem[] }>('/admin/prompts');
      setPrompts(res.data?.items ?? []);
    } catch (err) {
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleChange = (index: number, field: keyof PromptItem, value: any) => {
    const copy = [...prompts];
    (copy[index] as any)[field] = value;
    setPrompts(copy);
  };

  const handleSave = async (p: PromptItem) => {
    if (!p.key || !p.template) return;
    setSavingKey(p.key);
    try {
      await adminApi.post('/admin/prompts', { key: p.key, template: p.template, description: p.description, metadata: p.metadata });
      await fetchPrompts();
    } catch (err) {
      // minimal feedback handling; expand as needed
    } finally {
      setSavingKey(null);
    }
  };

  const handleCreateBlank = () => {
    setPrompts([{ key: `prompt_${Date.now()}`, template: '', description: '' }, ...prompts]);
  };

  // Copy to clipboard helper (with fallback)
  async function copyToClipboard(text: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      // lightweight feedback
      // eslint-disable-next-line no-alert
      alert('Template copied to clipboard');
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Failed to copy to clipboard');
      console.error('Copy failed', err);
    }
  }

  // Update inline sample body when admin edits it
  const updateSampleBody = (idx: number, newBody: string) => {
    setSampleTemplates((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], body: newBody };
      return copy;
    });
  };

  // Insert the edited sample into the editor area (convenience)
  const insertSampleIntoEditor = (idx: number) => {
    const t = sampleTemplates[idx];
    setEditorInitial({
      key: `sample_${Date.now()}`,
      name: t.title,
      description: t.description,
      body: t.body,
      version: 1,
      enabled: true,
      example: '',
    });
    // scroll to anchor
    setTimeout(() => {
      const el = document.querySelector('.prompt-editor-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  return (
    <AdminLayout title="Prompts">
      <Box>
        <Typography variant="h5">AI Prompt Templates</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Edit and save prompt templates. Changes are immediate and stored in the database.
        </Typography>

        {/* Editor area */}
        <Box sx={{ mb: 3 }}>
          <div className="prompt-editor-anchor" />
          <PromptEditor initial={editorInitial} onSaved={fetchPrompts} />
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Button variant="contained" onClick={handleCreateBlank}>New Prompt</Button>
          {/* Previously "Load sample" buttons are replaced by inline editable samples below */}
        </Stack>

        {/* Samples area: inline editable templates with copy and insert buttons */}
        <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
          <Typography variant="h6">Sample Math Templates (click to edit / copy)</Typography>
          {sampleTemplates.map((s, idx) => (
            <Paper key={idx} className={styles.card} sx={{ p: 2 }}>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle1">{s.title}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{s.description}</Typography>
                  <TextField
                    label="Template (editable)"
                    value={s.body}
                    onChange={(e) => updateSampleBody(idx, e.target.value)}
                    fullWidth
                    multiline
                    minRows={4}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                    <IconButton title="Copy template" onClick={() => copyToClipboard(s.body)} size="large">
                      <ContentCopyIcon />
                    </IconButton>

                    <Button variant="outlined" onClick={() => insertSampleIntoEditor(idx)}>
                      Insert into editor
                    </Button>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Tip: Edit the text above directly, then click Copy to copy the modified template to your clipboard.
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Box>

        <DividerComponent />

        {loading ? <CircularProgress /> : (
          <div style={{ display: 'grid', gap: 12 }}>
            {prompts.map((p, i) => (
              <Paper key={p.key || i} className={styles.card}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField label="Key" fullWidth value={p.key} onChange={(e) => handleChange(i, 'key', e.target.value)} size="small" />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField label="Description" fullWidth value={p.description || ''} onChange={(e) => handleChange(i, 'description', e.target.value)} size="small" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Template" fullWidth multiline minRows={4} value={p.template} onChange={(e) => handleChange(i, 'template', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sx={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" color="secondary" onClick={() => fetchPrompts()}>Reload</Button>
                    <Button variant="contained" onClick={() => handleSave(p)} disabled={savingKey === p.key}>
                      {savingKey === p.key ? 'Saving...' : 'Save'}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </div>
        )}
      </Box>
    </AdminLayout>
  );
}

// small divider component for readability
function DividerComponent() {
  return <Box sx={{ my: 2 }}><hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.06)' }} /></Box>;
}