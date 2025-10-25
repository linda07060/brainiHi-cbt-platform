import { Button } from '@mui/material';

export default function GoogleButton() {
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
  };
  return (
    <Button
      variant="outlined"
      color="primary"
      fullWidth
      onClick={handleGoogleLogin}
      sx={{ py: 1.5, fontWeight: 'bold', fontSize: 18 }}
    >
      Sign in with Google
    </Button>
  );
}