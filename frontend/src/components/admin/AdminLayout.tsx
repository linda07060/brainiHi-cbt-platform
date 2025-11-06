import React from 'react';
import Link from 'next/link';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

type AdminLayoutProps = {
  children?: React.ReactNode;
  title?: string;
};

const drawerWidth = 220;

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const theme = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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

  return (
    <Box sx={{ display: 'flex' }}>
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
          <Typography variant="h6" noWrap component="div">
            {title ? `${title} — Admin` : 'Admin Console'}
          </Typography>
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
  );
}