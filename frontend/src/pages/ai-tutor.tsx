import React from 'react';
import { Box, Container } from '@mui/material';
import TutorChat from '../components/TutorChat';

export default function AiTutorPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box>
        <TutorChat />
      </Box>
    </Container>
  );
}