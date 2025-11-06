import React, { useEffect, useState, useRef } from 'react';
import { Box, TextField, Button, Paper, Typography, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

type TutorMessage = { role: string; text: string; createdAt?: string; [k: string]: any };
type Conversation = { id?: number | string; messages?: TutorMessage[]; [k: string]: any };
type TutorHistoryResponse = Conversation | Conversation[];

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? (v as number) : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function TutorChat({ conversationIdProp }: { conversationIdProp?: number }) {
  const { token } = useAuth() as any;
  const [conversationId, setConversationId] = useState<number | null>(conversationIdProp ?? null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
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

        // Cast to a permissive type so TS knows it can be either a list or an object
        const data = (res?.data ?? {}) as TutorHistoryResponse;

        if (Array.isArray(data)) {
          // list returns recent convos
          if (data.length > 0) {
            const first = data[0] as Conversation;
            setConversationId(toNumberOrNull(first.id ?? conversationIdProp ?? null));
            setMessages(first.messages ?? []);
          }
        } else if ((data as Conversation).messages) {
          const conv = data as Conversation;
          setMessages(conv.messages ?? []);
          setConversationId(toNumberOrNull(conv.id ?? conversationIdProp ?? null));
        }
      } catch (err) {
        // ignore load errors for now
        // eslint-disable-next-line no-console
        console.warn('Failed to load tutor history', err);
      }
    };
    load();
    // We intentionally don't include conversationId in deps so initial load can pick a default.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, conversationIdProp]);

  useEffect(() => {
    // auto-scroll when messages change
    try {
      if (listRef.current) {
        listRef.current.scrollTo?.({ top: 99999 });
      }
    } catch {}
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !token) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/ai/tutor-chat`,
        {
          message: input.trim(),
          conversationId: conversationId ?? undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // permissive typing for the reply shape
      const data = (res?.data ?? {}) as { conversationId?: number | string; reply?: string; message?: string; [k: string]: any };

      // update conversation id if returned (normalize to number|null)
      const newConversationId = toNumberOrNull(data.conversationId ?? conversationId ?? null);
      setConversationId(newConversationId);

      // append user message and assistant reply (defensive)
      setMessages((m) => [
        ...m,
        { role: 'user', text: input.trim(), createdAt: new Date().toISOString() },
        { role: 'assistant', text: data.reply ?? String(data?.message ?? 'Sorry, no reply'), createdAt: new Date().toISOString() },
      ]);

      setInput('');
    } catch (err) {
      // eslint-disable-next-line no-console
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
        <TextField
          fullWidth
          placeholder="Ask your tutor a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button variant="contained" disabled={loading} onClick={send}>
          {loading ? <CircularProgress size={20} /> : 'Send'}
        </Button>
      </Box>
    </Paper>
  );
}