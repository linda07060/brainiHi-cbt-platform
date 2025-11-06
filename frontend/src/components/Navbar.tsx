import React from 'react';
import Link from 'next/link';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useAuth } from '../context/AuthContext';

/**
 * Navbar: defensively read the user's role rather than assuming an `admin` field
 * is present on the Auth context value. The User entity in the backend has a
 * `role` column (default 'user'), so we check user?.role === 'admin' to decide
 * whether to show admin links.
 *
 * This avoids the TypeScript error:
 *   Property 'admin' does not exist on type 'AuthContextValue'.
 */
export default function Navbar(): JSX.Element {
  // keep the context value untyped here so TS won't complain if your AuthContext
  // shape changes; derive `isAdmin` from the authoritative `user.role` field.
  const authAny = useAuth() as any;
  const user = authAny?.user ?? authAny; // support both shapes: { user } or direct user
  const isAdmin = !!(user && (user.role === 'admin' || user?.isAdmin === true));

  return (
    <AppBar position="static" color="inherit" elevation={0}>
      <Toolbar>
        <Box sx={{ flexGrow: 1 }}>
          <Link href="/" passHref legacyBehavior>
            <a style={{ textDecoration: 'none', color: 'inherit' }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                BrainHi
              </Typography>
            </a>
          </Link>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Link href="/pricing" passHref legacyBehavior>
            <Button color="inherit">Pricing</Button>
          </Link>

          <Link href="/tests" passHref legacyBehavior>
            <Button color="inherit">Practice</Button>
          </Link>

          {isAdmin && (
            <Link href="/admin" passHref legacyBehavior>
              <Button color="primary" variant="contained">Admin</Button>
            </Link>
          )}

          {user ? (
            <Link href="/dashboard" passHref legacyBehavior>
              <Button color="inherit">Dashboard</Button>
            </Link>
          ) : (
            <Link href="/login" passHref legacyBehavior>
              <Button color="inherit">Login</Button>
            </Link>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}