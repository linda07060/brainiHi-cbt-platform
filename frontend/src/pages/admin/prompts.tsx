import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Box, Typography, Paper, TextField, Button, Grid, CircularProgress } from '@mui/material';
import adminApi from '../../lib/adminApi';
import styles from '../../styles/Admin.module.css';

type PromptItem = { id?: number; key: string; template: string; description?: string; metadata?: any };

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      // Tell axios what shape we expect back so TypeScript knows `data.items` exists
      const res = await adminApi.get<{ items: PromptItem[] }>('/admin/prompts');
      setPrompts(res.data?.items ?? []);
    } catch (err) {
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrompts(); }, []);

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

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h5">AI Prompt Templates</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Edit and save prompt templates. Changes are immediate and stored in the database.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Button variant="contained" onClick={handleCreateBlank}>New Prompt</Button>
        </Box>

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