import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Container,
  useTheme,
  CssBaseline,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import styles from '../../styles/Admin.module.css';

type AdminLayoutProps = {
  children?: React.ReactNode;
  title?: string;
};

const drawerWidth = 220;

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const router = useRouter();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  /**
   * Admin logout should only remove the admin-specific session/token.
   * Do NOT call the shared user logout helper here (which clears the normal user's session).
   */
  const handleLogout = () => {
    try {
      if (typeof window !== 'undefined') {
        // only remove admin token / session
        localStorage.removeItem('adminAuth');
      }
    } catch {}
    // Redirect to admin login page
    router.push('/admin/login');
  };

  const drawer = (
    <Box role="presentation" sx={{ width: drawerWidth }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6">Admin</Typography>
      </Box>
      <List>
        <Link href="/admin/ai-logs" passHref legacyBehavior>
          <ListItemButton component="a">
            <ListItemText primary="AI Logs" />
          </ListItemButton>
        </Link>
        <Link href="/admin/prompts" passHref legacyBehavior>
          <ListItemButton component="a">
            <ListItemText primary="Prompts" />
          </ListItemButton>
        </Link>
        <Link href="/admin/users" passHref legacyBehavior>
          <ListItemButton component="a">
            <ListItemText primary="Users" />
          </ListItemButton>
        </Link>
        <Link href="/admin/settings" passHref legacyBehavior>
          <ListItemButton component="a">
            <ListItemText primary="Settings" />
          </ListItemButton>
        </Link>
      </List>
    </Box>
  );

  // Add a class on the <body> while admin layout is mounted so we can hide footer
  React.useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.body.classList.add('admin-hide-footer');
      }
    } catch {}
    return () => {
      try {
        if (typeof document !== 'undefined') {
          document.body.classList.remove('admin-hide-footer');
        }
      } catch {}
    };
  }, []);

  return (
    <>
      {/* Global style to hide the site footer only when on admin pages.
          This avoids altering the global footer component and only hides it
          while an admin route is active (body.admin-hide-footer present). */}
      <style jsx global>{`
        body.admin-hide-footer footer {
          display: none !important;
        }
      `}</style>

      {/* add adminRoot class so admin CSS rules apply */}
      <Box className={styles.adminRoot} sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          color="primary"
          sx={{
            zIndex: (t) => t.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
              aria-label="open drawer"
              size="large"
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flex: 1 }}>
              {title ? `${title} — Admin` : 'Admin Console'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button color="inherit" onClick={() => router.push('/admin/dashboard')}>Dashboard</Button>
              <Button color="inherit" onClick={() => router.push('/admin/users')}>Users</Button>
              <Button color="inherit" onClick={() => router.push('/admin/ai-logs')}>AI Logs</Button>
              <Button color="secondary" variant="outlined" onClick={handleLogout}>
                Logout
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Permanent drawer on sm+ screens, temporary drawer on xs */}
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="admin navigation"
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>

          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: 8, // offset appbar height
          }}
        >
          <Container maxWidth="lg">
            {children}
          </Container>
        </Box>
      </Box>
    </>
  );
}