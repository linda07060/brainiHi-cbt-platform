import React, { useEffect, useState, useRef } from 'react';
import { Box, TextField, Button, Paper, Typography, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function TutorChat({ conversationIdProp }: { conversationIdProp?: number }) {
  const { token } = useAuth() as any;
  const [conversationId, setConversationId] = useState<number | null>(conversationIdProp ?? null);
  const [messages, setMessages] = useState<Array<{ role: string; text: string; createdAt: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/ai/tutor-history`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { conversationId: conversationId ?? undefined },
        });
        if (Array.isArray(res.data)) {
          // list returns recent convos
          if (res.data.length > 0) {
            setConversationId(res.data[0].id);
            setMessages(res.data[0].messages || []);
          }
        } else if (res.data?.messages) {
          setMessages(res.data.messages || []);
          setConversationId(res.data.id);
        }
      } catch (err) {
        // ignore
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: 99999 });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !token) return;
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/ai/tutor-chat`, {
        message: input.trim(),
        conversationId: conversationId ?? undefined,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversationId(res.data.conversationId || conversationId);
      setMessages((m) => [...m, { role: 'user', text: input.trim(), createdAt: new Date().toISOString() }, { role: 'assistant', text: res.data.reply, createdAt: new Date().toISOString() }]);
      setInput('');
    } catch (err) {
      // show small error message inline (omitted for brevity)
      console.error('Tutor chat send error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" mb={1}>Personal AI Tutor</Typography>

      <Box ref={listRef} sx={{ maxHeight: 300, overflow: 'auto', mb: 2, border: '1px solid #eee', p: 1 }}>
        <List dense disablePadding>
          {messages.map((m, i) => (
            <ListItem key={i}>
              <ListItemText
                primary={<strong>{m.role === 'user' ? 'You' : 'Tutor'}</strong>}
                secondary={<span>{m.text}</span>}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField fullWidth placeholder="Ask your tutor a question..." value={input} onChange={(e) => setInput(e.target.value)} />
        <Button variant="contained" disabled={loading} onClick={send}>{loading ? <CircularProgress size={20} /> : 'Send'}</Button>
      </Box>
    </Paper>
  );
}