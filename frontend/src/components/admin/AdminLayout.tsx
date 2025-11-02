import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Admin.module.css';

type Props = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  return (
    <Box className={styles.adminRoot}>
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar className={styles.toolbar}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton edge="start" color="inherit" aria-label="menu" size="large">
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ fontWeight: 800 }}>
              BrainiHi Admin
            </Typography>
          </Box>

          <Box sx={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Typography variant="body2" color="text.secondary">
              {user?.name || user?.email}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout} title="Logout">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box className={styles.container}>
        <Drawer
          variant="permanent"
          anchor="left"
          className={styles.drawer}
          PaperProps={{ className: styles.drawerPaper }}
        >
          <Toolbar />
          <List>
            <Link href="/admin/dashboard" passHref legacyBehavior>
              <a className={styles.navLink}>
                <ListItemButton selected={router.pathname === '/admin/dashboard'}>
                  <ListItemIcon><DashboardIcon /></ListItemIcon>
                  <ListItemText primary="Dashboard" />
                </ListItemButton>
              </a>
            </Link>

            <Link href="/admin/users" passHref legacyBehavior>
              <a className={styles.navLink}>
                <ListItemButton selected={router.pathname === '/admin/users'}>
                  <ListItemIcon><PeopleIcon /></ListItemIcon>
                  <ListItemText primary="Users" />
                </ListItemButton>
              </a>
            </Link>
          </List>
        </Drawer>

        <Box component="main" className={styles.main}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}