import React, { useEffect, useState } from 'react';
import { Paper, Typography, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AnalyticsPanel() {
  const { token } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/ai/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        console.error('Analytics fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token]);

  if (loading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" mb={1}>Weak areas & suggestions</Typography>
      {data?.weakAreas?.length ? (
        <List dense>
          {data.weakAreas.map((w: any, idx: number) => (
            <ListItem key={idx}>
              <ListItemText
                primary={`${w.area} — ${w.misses} missed`}
                secondary={`Recommended practice: ${w.recommendedPractice} questions`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2">No weak areas found — well done!</Typography>
      )}
    </Paper>
  );
}