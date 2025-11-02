import * as React from "react";
import Head from "next/head";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "../theme";
import { AuthProvider } from "../context/AuthContext";
import type { AppProps } from "next/app";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";

// Global cookie banner (keep)
import CookieConsent from "../components/CookieConsent";

function tryInitAnalyticsFromGlobal() {
  try {
    const win = window as any;
    if (typeof win.initAnalytics === "function") {
      win.initAnalytics();
      return true;
    }
  } catch (err) {
    // ignore
  }
  return false;
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("brainihi_cookie_consent_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.analytics) {
          tryInitAnalyticsFromGlobal();
        }
      }
    } catch (err) {
      // ignore
    }

    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.analytics) {
          tryInitAnalyticsFromGlobal();
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("cookie-consent", handler as EventListener);
    return () => {
      window.removeEventListener("cookie-consent", handler as EventListener);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Head>
          <title>Prepare for exams faster with AI — BrainiHi</title>
          <meta
            name="description"
            content="Practice smarter, get instant explanations, and improve your scores with BrainiHi — AI-powered exam preparation."
          />
        </Head>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={router.route}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -32 }}
            transition={{ duration: 0.45, ease: [0.39, 0.58, 0.57, 1] }}
            style={{ minHeight: "100vh" }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>

        {/* Cookie banner remains mounted globally */}
        <CookieConsent />
      </AuthProvider>
    </ThemeProvider>
  );
}