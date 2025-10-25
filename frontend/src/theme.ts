import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1D4ED8',
    },
    secondary: {
      main: '#6D28D9',
    },
    info: {
      main: '#22D3EE',
    },
    success: {
      main: '#A3E635',
    },
    background: {
      default: '#f6f8fa',
    },
    text: {
      primary: '#222',
    },
  },
  typography: {
    fontFamily: 'Segoe UI, Arial, sans-serif',
  },
});

export default theme;