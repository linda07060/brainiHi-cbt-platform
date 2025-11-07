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
import axios from 'axios';

// Use the merged Footer component (Footer now includes the legal row)
import Footer from "../components/Footer";

// Site-wide sticky notice
import StickyNotice from "../components/StickyNotice";

// Site-wide compact legal bar that opens the full disclaimer modal
import FooterLegalBar from "../components/FooterLegalBar";

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

  // Global axios response interceptor: dispatch 'soft-limit-warning' when server returns { warning: '...' }
  React.useEffect(() => {
    const id = axios.interceptors.response.use((resp) => {
      try {
        // Cast resp.data to a permissive shape so TS knows 'warning' may exist
        const data = (resp?.data ?? {}) as { warning?: string | null };
        const warning = data.warning;
        if (warning) {
          window.dispatchEvent(new CustomEvent('soft-limit-warning', { detail: warning }));
        }
      } catch (err) {
        // ignore
      }
      return resp;
    }, (error) => {
      // pass through errors
      return Promise.reject(error);
    });

    return () => {
      axios.interceptors.response.eject(id);
    };
  }, []);

  React.useEffect(() => {
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

  // Hide footer on specific routes (no footer on auth pages and selected app pages)
  // Added routes: /dashboard, /analytics, /ai-tutor, /test (covers /test/submit as a prefix)
  const NO_FOOTER_PREFIXES = ["/login", "/register", "/dashboard", "/analytics", "/ai-tutor", "/test", "/review", "/admin/login"];
  const showFooter = !NO_FOOTER_PREFIXES.some((p) => router.pathname.startsWith(p));

  // Also hide sticky notice on auth pages (keeps auth screens uncluttered)
  const NO_NOTICE_PREFIXES = ["/login", "/register"];
  const showStickyNotice = !NO_NOTICE_PREFIXES.some((p) => router.pathname.startsWith(p));

  const poweredText =
    "Powered by OpenAI — our platform uses OpenAI technologies to generate questions, explanations, and performance analysis. OpenAI provides the underlying models; BrainiHi configures prompts, validation and quality controls to produce safe, educational content.";

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

        {/* Sticky notice site-wide (hidden on /login and /register).
            persistMinutes=null => dismissal persists permanently */}
        {showStickyNotice && (
          <StickyNotice
            text={poweredText}
            storageKey="powered_notice_v1"
            persistMinutes={null}
            hideOnRoutes={NO_NOTICE_PREFIXES}
            onDismiss={() => {
              try {
                // example dataLayer push; harmless if undefined
                (window as any).dataLayer?.push?.({ event: "sticky_notice_dismissed", notice: "powered_by_openai" });
              } catch {}
            }}
          />
        )}

        {/* Compact legal bar shown site-wide above the footer (always mounted so it's visible on page load). */}
        <FooterLegalBar />

        {/* Site-wide merged Footer (includes legal links / copyright row)
            Conditionally hidden on routes such as /login, /register, /dashboard, /analytics, /review, /ai-tutor, and /test. */}
        {showFooter && <Footer />}
      </AuthProvider>
    </ThemeProvider>
  );
}