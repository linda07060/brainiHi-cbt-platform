import React from 'react';
import { Box, Link, Typography } from '@mui/material';
import { useSiteSettings } from './SiteSettingsProvider';

export default function SiteFooterSupport({ compact = false }: { compact?: boolean }) {
  const { settings } = useSiteSettings();
  const support = settings?.support ?? {};

  // Defensive trimming — avoid calling .trim() on undefined
  const email = typeof support.email === 'string' ? support.email.trim() : '';
  const phone = typeof support.phone === 'string' ? support.phone.trim() : '';
  const url = typeof support.url === 'string' ? support.url.trim() : '';

  if (!email && !phone && !url) {
    return null;
  }

  return (
    <Box
      component="footer"
      sx={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        justifyContent: compact ? 'flex-end' : 'space-between',
        flexWrap: 'wrap',
        py: 2,
        px: 2,
        fontSize: 13,
        color: 'text.secondary',
      }}
    >
      <Box>
        {email && (
          <Typography component="span" sx={{ mr: 2 }}>
            <Link href={`mailto:${email}`} underline="hover">
              {email}
            </Link>
          </Typography>
        )}
        {phone && (
          <Typography component="span" sx={{ mr: 2 }}>
            <a href={`tel:${phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              {phone}
            </a>
          </Typography>
        )}
      </Box>

      {url && (
        <Box>
          <Link href={url} target="_blank" rel="noopener noreferrer">
            Help & support
          </Link>
        </Box>
      )}
    </Box>
  );
}