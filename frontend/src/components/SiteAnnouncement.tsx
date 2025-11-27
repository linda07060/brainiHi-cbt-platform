import React from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useSiteSettings } from './SiteSettingsProvider';

/**
 * SiteAnnouncement: minimal banner that:
 * - only renders when provider has finished initial fetch (loading=false) AND an enabled announcement exists
 * - uses sessionStorage to remember close for this tab/session
 * - does not steal focus or trigger reflows
 */
export default function SiteAnnouncement() {
  const { settings, loading } = useSiteSettings();
  const announcement = settings?.announcement ?? {};
  const enabled = !!announcement?.enabled;
  const html = (announcement?.html ?? '').toString().trim();

  // If provider still fetching, skip rendering (avoid flicker)
  if (loading) return null;

  if (!enabled || !html) return null;

  const sessionKey = 'site_announcement_dismissed_v1';
  const [visible, setVisible] = React.useState<boolean>(() => {
    try {
      return sessionStorage.getItem(sessionKey) ? false : true;
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const handleClose = () => {
    try {
      sessionStorage.setItem(sessionKey, '1');
    } catch {}
    setVisible(false);
  };

  return (
    <Box
      component="header"
      sx={{
        width: '100%',
        backgroundColor: '#fff9e6',
        color: '#333',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        py: 1,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1400,
      }}
    >
      <Box sx={{ flex: 1, mr: 2 }}>
        <div
          style={{ fontSize: 14, lineHeight: '1.4' }}
          // If you want sanitization: replace with DOMPurify.sanitize(html)
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Box>

      <Box sx={{ ml: 2 }}>
        <IconButton aria-label="close announcement" size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}