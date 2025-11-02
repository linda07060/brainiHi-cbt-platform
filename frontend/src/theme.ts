import { createTheme } from "@mui/material/styles";

/**
 * Brand-aligned MUI theme for BrainiHi
 * - Primary: brand maroon (#861f41)
 * - Secondary / accent: yellow (#FDB913)
 * - Background + text tuned for a light, minimal look
 * - Buttons use no uppercase transform and a stronger weight for a modern, friendly tone
 */

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#861f41", // BrainiHi brand maroon
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#FDB913", // accent yellow
      contrastText: "#231f20",
    },
    info: {
      main: "#22D3EE",
    },
    success: {
      main: "#16A34A",
    },
    warning: {
      main: "#F59E0B",
    },
    background: {
      default: "#f8fafb", // very light neutral background
      paper: "#ffffff",
    },
    text: {
      primary: "#231f20",
      secondary: "#6b6b6b",
    },
  },

  typography: {
    // Keep site-first fonts; add Inter as preferred system font if available
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    button: {
      textTransform: "none", // no all-caps buttons
      fontWeight: 800,
    },
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
  },

  shape: {
    borderRadius: 10,
  },

  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: false,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingTop: 10,
          paddingBottom: 10,
        },
        containedPrimary: {
          // stronger shadow for primary CTA, subtle lift
          boxShadow: "0 10px 26px rgba(134,31,65,0.06)",
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },

    MuiLink: {
      styleOverrides: {
        root: {
          color: "#861f41",
          textDecoration: "none",
          fontWeight: 700,
          "&:hover": {
            textDecoration: "underline",
          },
        },
      },
    },
  },
});

export default theme;