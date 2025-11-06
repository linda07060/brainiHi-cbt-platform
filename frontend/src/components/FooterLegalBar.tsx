import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import styles from "../styles/FooterLegalBar.module.css";
import LegalDisclaimer from "./LegalDisclaimer";

/**
 * FooterLegalBar
 * - small bar shown above the footer
 * - session-dimissible (sessionStorage)
 * - "Read full disclaimer" opens modal (emits analytics events)
 * - "Learn more" navigates or scrolls to /how-it-works#content-policy
 * - emits analytic events when opened and when read (modal close)
 */

const SESSION_KEY = "footer_legal_dismissed_session_v1";

export default function FooterLegalBar(): JSX.Element | null {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // session dismissal: if set, hide for current session
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw === "1") {
        setVisible(false);
        return;
      }
    } catch {
      // ignore
    }
    // detect small screens for condensed layout
    const check = () => setIsMobile(window.innerWidth <= 520);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check as any);
  }, []);

  function dismissForSession() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    setVisible(false);
    try {
      window.dispatchEvent(new CustomEvent("footer-legal-dismissed", { detail: { when: Date.now(), scope: "session" } }));
    } catch {}
  }

  function emitEvent(name: string, detail: Record<string, any> = {}) {
    try {
      // dataLayer push if available
      (window as any).dataLayer?.push?.({ event: name, ...detail });
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {}
  }

  function openModal() {
    setOpen(true);
    emitEvent("legal_disclaimer_opened", { source: "footer_bar", when: Date.now() });
  }

  function closeModal() {
    setOpen(false);
    // emit "read" event: this denotes user opened+closed the full disclaimer (audit trail)
    emitEvent("legal_disclaimer_read", { source: "footer_bar", when: Date.now() });
  }

  async function handleLearnMore(e?: React.MouseEvent) {
    // If already on the how-it-works page, attempt to scroll to the element with id "content-policy"
    const targetId = "content-policy";
    if (router.pathname === "/how-it-works") {
      try {
        // small delay to ensure any layout is stable
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) {
            // compute header offset if present
            let headerOffset = 0;
            try {
              const header =
                document.querySelector(".site-header") ||
                document.querySelector("header") ||
                document.querySelector(".topbar") ||
                document.querySelector(".navbar");
              if (header instanceof HTMLElement) {
                headerOffset = Math.max(0, header.getBoundingClientRect().height);
              }
            } catch {}
            const rect = el.getBoundingClientRect();
            const absoluteTop = rect.top + window.pageYOffset;
            const targetY = Math.max(0, absoluteTop - headerOffset - 12);
            window.scrollTo({ top: targetY, behavior: "smooth" });
            // emit analytics that the user used Learn more to jump to the content policy
            emitEvent("legal_learn_more_used", { from: "footer_bar", when: Date.now() });
          } else {
            // fallback: open modal
            openModal();
          }
        }, 70);
      } catch {
        openModal();
      }
      return;
    }

    // Not on the how-it-works page: navigate to the anchor so the page can handle scrolling
    try {
      // Use router.push so Next's client navigation is used and hash is present
      await router.push(`/how-it-works#${targetId}`);
      emitEvent("legal_learn_more_navigated", { from: "footer_bar", when: Date.now(), destination: `/how-it-works#${targetId}` });
    } catch {
      // fallback: open modal
      openModal();
    }
  }

  if (!visible) return null;

  return (
    <>
      <div className={`${styles.bar} ${isMobile ? styles.condensed : ""}`} role="contentinfo" aria-label="Legal notice">
        <Box className={styles.inner}>
          {!isMobile ? (
            <>
              <Typography component="div" className={styles.text}>
                <strong>Content and Exam Disclaimer —</strong>{" "}
                BrainiHi is not affiliated with official exam boards. All practice items are AI‑generated simulations for learning.
              </Typography>

              <div className={styles.actions}>
                <Button size="small" variant="text" onClick={openModal} aria-label="Read full disclaimer">Read full disclaimer</Button>
                <Button size="small" variant="text" onClick={handleLearnMore} aria-label="Learn more about content policy">Learn more</Button>
                <Button size="small" onClick={dismissForSession} aria-label="Dismiss disclaimer for this session">Dismiss (session)</Button>
              </div>
            </>
          ) : (
            // Condensed mobile bar: shorter text, icon-like links to save vertical space
            <>
              <Typography component="div" className={styles.mobileText}>
                Content disclaimer — AI‑generated practice.
              </Typography>

              <div className={styles.mobileActions}>
                <Button size="small" variant="text" onClick={openModal} aria-label="Read full disclaimer">Read</Button>
                <Button size="small" variant="text" onClick={handleLearnMore} aria-label="Learn more">More</Button>
                <IconButton size="small" onClick={dismissForSession} aria-label="Dismiss for session">×</IconButton>
              </div>
            </>
          )}
        </Box>
      </div>

      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="md" aria-labelledby="legal-dialog-title">
        <DialogTitle id="legal-dialog-title">Content and Exam Disclaimer</DialogTitle>
        <DialogContent dividers>
          <LegalDisclaimer />
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={closeModal} variant="contained">Close</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}