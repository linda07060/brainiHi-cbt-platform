import React from 'react';
import { Box, Button } from '@mui/material';
import { useRouter } from 'next/router';

export type EffectiveUsageLike = { plan?: string | null };

type Props = {
  effectiveUsage?: EffectiveUsageLike | null;
};

/**
 * TutorUxSnippet - small presentational component.
 * Place in src/components and import into Dashboard:
 *   import TutorUxSnippet from '@/components/TutorUxSnippet';
 *   <TutorUxSnippet effectiveUsage={effectiveUsage} />
 *
 * Notes:
 * - uses useRouter internally (no router prop required).
 * - safe TSX, small surface area so it won't introduce hook/hydration issues.
 */
export default function TutorUxSnippet({ effectiveUsage }: Props) {
  const router = useRouter();
  const planName = String(effectiveUsage?.plan ?? '').toLowerCase();
  const isTutor = planName.includes('tutor');

  if (!isTutor) return null;

  return (
    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => router.push('/ai-tutor')}
        sx={{ textTransform: 'none' }}
      >
        Open AI Tutor
      </Button>

      <Button
        variant="outlined"
        size="small"
        onClick={() => router.push('/analytics')}
        sx={{ textTransform: 'none' }}
      >
        View analytics
      </Button>
    </Box>
  );
}