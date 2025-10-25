import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, admin } = useAuth();
  return (
    <AppBar position="static" color="inherit">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>CBT Platform</Typography>
        <Box>
          <Button component={Link} href="/">Home</Button>
          <Button component={Link} href="/about">About</Button>
          <Button component={Link} href="/contact">Contact</Button>
          {!user && !admin && <Button component={Link} href="/login">CBT Portal</Button>}
          {user && (
            <>
              <Button component={Link} href="/dashboard">Dashboard</Button>
              <Button component={Link} href="/logout">Logout</Button>
            </>
          )}
          {admin && (
            <>
              <Button component={Link} href="/admin/dashboard">Admin</Button>
              <Button component={Link} href="/logout">Logout</Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}