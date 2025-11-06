import { useEffect, useState } from "react";
import styles from "../styles/Preloader.module.css";

/**
 * Minimal, professional preloader.
 * - No logo; uses a subtle centered ring spinner
 * - Fade-out animation preserved
 * - Accessible: spinner has role="status" and visually hidden "Loading…" text
 *
 * Replace your existing Preloader component with this file.
 */
export default function Preloader() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Start fade out after 2.5s (same behavior as before)
    const fadeTimer = setTimeout(() => setFade(true), 2500);
    // Remove preloader after fade-out completes (0.8s)
    const removeTimer = setTimeout(() => setShow(false), 3300);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`${styles.overlay} ${fade ? styles.fadeOut : ""}`}
      aria-hidden={false}
      aria-live="polite"
    >
      <div className={styles.inner}>
        <div className={styles.spinner} role="status" aria-label="Loading" />
        <span className={styles.visuallyHidden}>Loading…</span>
      </div>
    </div>
  );
}