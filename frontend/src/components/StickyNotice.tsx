import React, { useEffect, useRef, useState } from "react";
import styles from "../styles/StickyNotice.module.css";

type StickyNoticeProps = {
  text: string;
  storageKey?: string; // localStorage key to remember dismiss
  persistMinutes?: number | null; // optional expiry for dismissal (minutes). null => permanent dismissal
  showOnRoutes?: string[] | null; // if provided, only show on routes that start with one of these prefixes; null => show everywhere
  hideOnRoutes?: string[] | null; // if provided, hide on these route prefixes
  onDismiss?: () => void; // optional callback (analytics)
};

export default function StickyNotice({
  text,
  storageKey = "sticky_notice_dismissed",
  persistMinutes = null,
  showOnRoutes = null,
  hideOnRoutes = null,
  onDismiss,
}: StickyNoticeProps): JSX.Element | null {
  const [visible, setVisible] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const innerRef = useRef<HTMLDivElement | null>(null);

  // Only run localStorage/window code on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine initial visibility from localStorage (client-only)
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setVisible(true);
        return;
      }
      if (persistMinutes === null) {
        // dismissed permanently
        setVisible(false);
        return;
      }
      // parse stored timestamp
      const ts = Number(raw || 0);
      if (!ts) {
        setVisible(true);
        return;
      }
      const expiresAt = ts + persistMinutes * 60 * 1000;
      if (Date.now() > expiresAt) {
        // expired, show again
        localStorage.removeItem(storageKey);
        setVisible(true);
        return;
      }
      // still dismissed
      setVisible(false);
    } catch {
      setVisible(true);
    }
  }, [mounted, storageKey, persistMinutes]);

  // Measure & publish CSS var so the page can avoid overlap (body padding)
  useEffect(() => {
    if (!visible) {
      // remove padding variable
      try {
        document.documentElement.style.setProperty("--sticky-space", "0px");
      } catch {}
      return;
    }
    function updateSpace() {
      try {
        const el = innerRef.current;
        if (!el) return;
        const h = Math.ceil(el.getBoundingClientRect().height);
        // leave a small gap
        document.documentElement.style.setProperty("--sticky-space", `${h + 18}px`);
      } catch {}
    }
    updateSpace();
    // update on resize / orientation change
    window.addEventListener("resize", updateSpace, { passive: true });
    window.addEventListener("orientationchange", updateSpace, { passive: true });
    // also update after fonts/images load
    const t = setTimeout(updateSpace, 300);
    return () => {
      window.removeEventListener("resize", updateSpace as EventListener);
      window.removeEventListener("orientationchange", updateSpace as EventListener);
      clearTimeout(t);
    };
  }, [visible]);

  function dismiss() {
    try {
      if (persistMinutes === null) {
        localStorage.setItem(storageKey, "1"); // permanent
      } else {
        localStorage.setItem(storageKey, String(Date.now())); // timestamp
      }
    } catch {
      // ignore storage errors
    }

    // emit an event for analytics / QA listeners
    try {
      window.dispatchEvent(
        new CustomEvent("sticky-notice-dismissed", {
          detail: { key: storageKey, timestamp: Date.now(), persistMinutes },
        })
      );
    } catch {}

    if (typeof onDismiss === "function") {
      try {
        onDismiss();
      } catch {}
    }

    setVisible(false);
  }

  // route-based show/hide helpers (client-only)
  useEffect(() => {
    if (!mounted) return;
    try {
      const path = window.location?.pathname ?? "";
      if (Array.isArray(hideOnRoutes)) {
        for (const p of hideOnRoutes) {
          if (path.startsWith(p)) {
            setVisible(false);
            return;
          }
        }
      }
      if (Array.isArray(showOnRoutes) && showOnRoutes.length > 0) {
        let ok = false;
        for (const p of showOnRoutes) {
          if (path.startsWith(p)) {
            ok = true;
            break;
          }
        }
        if (!ok) {
          setVisible(false);
          return;
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  if (!visible) return null;

  return (
    <div className={styles.sticky} role="region" aria-label="AI powered notice" aria-live="polite">
      <div className={styles.inner} ref={innerRef}>
        <div className={styles.text}>{text}</div>
        <button
          aria-label="Dismiss notice"
          className={styles.close}
          onClick={dismiss}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}