import React from 'react';
import Alert from '@mui/material/Alert';

/**
 * AccessibleAlert
 * - Renders a visual MUI Alert and also exposes its message to screen readers via aria-live.
 * - Use role="status" or role="alert" depending on severity. Here we use polite announcements for success/info.
 */
export default function AccessibleAlert({ severity = 'info', children }: { severity?: 'info' | 'success' | 'error' | 'warning'; children: React.ReactNode }) {
  return (
    <>
      {/* Screen reader-friendly live region (polite so it doesn't interrupt) */}
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
        {children}
      </div>

      {/* Visual alert */}
      <Alert severity={severity as any} role={severity === 'error' ? 'alert' : 'status'} sx={{ mb: 2 }}>
        {children}
      </Alert>
    </>
  );
}