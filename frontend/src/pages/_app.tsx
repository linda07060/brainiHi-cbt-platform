import * as React from 'react';
import Head from 'next/head';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '../theme';
import { AuthProvider } from '../context/AuthContext';
import type { AppProps } from 'next/app';

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Head>
          <title>CBT Platform</title>
        </Head>
        <AnimatePresence mode="wait">
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
      </AuthProvider>
    </ThemeProvider>
  );
}