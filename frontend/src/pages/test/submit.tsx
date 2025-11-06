import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { Container, Box, Typography, Button, CircularProgress } from '@mui/material';
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
        <title>Submit Test — Test Runner</title>
        <meta name="robots" content="noindex" />
      </Head>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {checking ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
            <CircularProgress />
            <Typography>Preparing submission runner…</Typography>
          </Box>
        ) : hasPending ? (
          // Client-only component will handle the submission automatically
          <TestSubmission />
        ) : (
          // Helpful fallback UI when there's no pending submission to run
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              No automatic submission in progress
            </Typography>
            <Typography sx={{ mb: 3 }}>
              If you want to create a test here, use the Dashboard or the Start test form on the Test page.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
              <Button component={Link} href="/dashboard" variant="contained">
                Back to Dashboard
              </Button>
              <Button component={Link} href="/test" variant="outlined">
                Start a Test
              </Button>
            </Box>
          </Box>
        )}
      </Container>
    </>
  );
}