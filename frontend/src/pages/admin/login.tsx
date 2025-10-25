import { Box, Button, Container, TextField, Typography } from '@mui/material';

export default function AdminLogin() {
  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" fontWeight="bold" mb={2}>Admin Login</Typography>
        <form method="POST" action="/api/admin/auth/login">
          <TextField
            label="Admin Email"
            name="email"
            type="email"
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Password"
            name="password"
            type="password"
            fullWidth
            margin="normal"
            required
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2, py: 1.5, fontWeight: 'bold', fontSize: 18 }}
          >
            Login
          </Button>
        </form>
      </Box>
    </Container>
  );
}