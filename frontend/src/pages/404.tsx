import React from 'react';
import { Box, Container, Typography, Button } from '@mui/material';
import Link from 'next/link';

export default function Custom404() {
  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 12 }}>
      <Typography variant="h2" fontWeight="bold" color="primary" gutterBottom>404</Typography>
      <Typography variant="h5" mb={2}>Page Not Found</Typography>
      <Button component={Link} href="/" variant="contained">Go Home</Button>
    </Container>
  );
}