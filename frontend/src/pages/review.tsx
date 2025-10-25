import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

interface Explanation {
  id: number;
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export default function ReviewPage() {
  const { query } = useRouter();
  const { user } = useAuth();
  const [details, setDetails] = useState<Explanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !query.id) return;
    setLoading(true);
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/tests/${query.id}/review`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(res => {
        setDetails(res.data.questions);
        setScore(res.data.score);
      })
      .finally(() => setLoading(false));
  }, [user, query.id]);

  if (!user) return <Typography>Please login.</Typography>;
  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 6 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Test Review
      </Typography>
      <Typography variant="h6" mb={2}>Score: {score}</Typography>
      <Paper sx={{ p: 2 }}>
        <List>
          {details.map((q, idx) => (
            <React.Fragment key={q.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={`${idx + 1}. ${q.question}`}
                  secondary={
                    <div>
                      <Typography color={q.isCorrect ? 'success.main' : 'error.main'}>
                        Your Answer: {q.yourAnswer} {q.isCorrect ? '✔️' : '❌'}
                      </Typography>
                      <Typography>
                        Correct Answer: {q.correctAnswer}
                      </Typography>
                      <Typography sx={{ mt: 1 }}>
                        <b>Explanation:</b> {q.explanation}
                      </Typography>
                    </div>
                  }
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
}