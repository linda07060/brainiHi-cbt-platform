import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

export default function Spinner({ size = 18 }: { size?: number }) {
  return <CircularProgress size={size} thickness={5} color="inherit" />;
}