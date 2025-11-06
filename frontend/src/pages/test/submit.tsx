import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { Container, Box, Typography, Button, CircularProgress, Paper } from '@mui/material';
import Link from 'next/link';

// Load TestSubmission only on the client because it reads sessionStorage / window
const TestSubmission = dynamic(() => import('../../components/TestSubmission'), { ssr: false });

export default function TestSubmitPage(): JSX.Element {
  const [checking, setChecking] = useState<boolean>(true);
  const [hasPending, setHasPending] = useState<boolean>(false);

  useEffect(() => {
    // Client-only check for pending submission or last created test
    if (typeof window === 'undefined') {
      setChecking(false);
      return;
    }

    try {
      const pending = sessionStorage.getItem('pendingTestSubmission');
      const last = sessionStorage.getItem('LAST_CREATED_TEST');
      setHasPending(Boolean(pending || last));
    } catch (err) {
      // If storage access fails, assume there's nothing pending
      setHasPending(false);
      // eslint-disable-next-line no-console
      console.debug('Error reading sessionStorage on submit page', err);
    } finally {
      setChecking(false);
    }
  }, []);

  return (
    <>
      <Head>
        <title>Submitting your test — Test Runner</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {checking ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Preparing submission runner…
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760, textAlign: 'center' }}>
              We are checking your browser for a pending test submission. This should only take a moment.
            </Typography>
          </Box>
        ) : hasPending ? (
          // Client-only component will handle the submission automatically
          <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Processing submission — please keep this tab open
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Our system is securely uploading and processing your answers. You will be automatically redirected to your
                results and explanations as soon as they are ready. This may take a few minutes for longer tests.
              </Typography>
            </Box>

            <Box>
              <TestSubmission />
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button component={Link} href="/dashboard" variant="outlined">
                Back to Dashboard
              </Button>
              <Button component={Link} href="/support" variant="text">
                Contact support
              </Button>
            </Box>
          </Paper>
        ) : (
          // Helpful fallback UI when there's no pending submission to run
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              No automatic submission in progress
            </Typography>
            <Typography sx={{ mb: 3, color: 'text.secondary', maxWidth: 760, margin: '0 auto' }}>
              There is no pending submission detected in this browser. If you recently completed a test on another device,
              you may need to return to this device or recreate the test here. Keep in mind that closing this tab before a
              submission completes can delay delivery of your personalised feedback.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
              <Button component={Link} href="/dashboard" variant="contained">
                Back to Dashboard
              </Button>
              <Button component={Link} href="/test" variant="outlined">
                Start a Test
              </Button>
            </Box>

            <Box sx={{ mt: 4 }}>
              <Typography variant="caption" color="text.secondary">
                Tip: If you expected to see a submission here, check your browser's sessionStorage or try the device where you
                started the test. For assistance, visit the support page.
              </Typography>
            </Box>
          </Box>
        )}
      </Container>
    </>
  );
}